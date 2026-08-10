import Database from '@tauri-apps/plugin-sql'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import { eq, desc, asc } from 'drizzle-orm'
import * as schema from '@/db/schema'
import type {
  Profile,
  BankAccount,
  Counterparty,
  Invoice,
  InvoiceWithDetails,
  Currency,
  InvoiceStatus,
} from '@/types'
import { autoSyncGoogleDriveIfConnected } from '@/lib/driveSync'
import { runDrizzleMigrations } from '@/lib/migrator'

let rawDbInstance: Database | null = null
let drizzleDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null
let migrationsPromise: Promise<void> | null = null

export async function getRawDb(): Promise<Database> {
  if (!rawDbInstance) {
    rawDbInstance = await Database.load('sqlite:invoices.db')
  }
  if (!migrationsPromise) {
    migrationsPromise = runDrizzleMigrations(rawDbInstance)
  }
  await migrationsPromise
  return rawDbInstance
}

export async function getDb() {
  if (!drizzleDbInstance) {
    const rawDb = await getRawDb()
    drizzleDbInstance = drizzle<typeof schema>(
      async (sql, params, method) => {
        try {
          if (method === 'run') {
            await rawDb.execute(sql, params)
            return { rows: [] }
          }
          const rows = await rawDb.select<any[]>(sql, params)
          if (!rows || rows.length === 0) {
            return { rows: [] }
          }
          if (method === 'get') {
            return { rows: [Object.values(rows[0])] }
          }
          return { rows: rows.map((r) => Object.values(r)) }
        } catch (e) {
          console.error('Error in Drizzle SQLite proxy query:', e)
          return { rows: [] }
        }
      },
      { schema }
    )
  }
  return drizzleDbInstance
}

// ----------------- Profile -----------------
export async function getProfile(): Promise<Profile | null> {
  const db = await getDb()
  const result = await db.select().from(schema.profiles).limit(1)
  if (result.length === 0) return null

  const p = result[0]
  return {
    id: p.id,
    business_name: p.businessName,
    tax_id: p.taxId,
    legal_address: p.legalAddress,
    email: p.email || undefined,
    default_currency: p.defaultCurrency as Currency,
    default_payment_terms: p.defaultPaymentTerms || undefined,
    custom_typst_template: p.customTypstTemplate || undefined,
    created_at: p.createdAt || undefined,
  }
}

export async function saveProfile(profile: Partial<Profile>): Promise<void> {
  const db = await getDb()
  const existing = await getProfile()

  if (existing) {
    await db
      .update(schema.profiles)
      .set({
        businessName: profile.business_name || '',
        taxId: profile.tax_id || '',
        legalAddress: profile.legal_address || '',
        email: profile.email || null,
        defaultCurrency: profile.default_currency || 'GEL',
        defaultPaymentTerms: profile.default_payment_terms || null,
        customTypstTemplate: profile.custom_typst_template || null,
      })
      .where(eq(schema.profiles.id, existing.id))
  } else {
    await db.insert(schema.profiles).values({
      businessName: profile.business_name || '',
      taxId: profile.tax_id || '',
      legalAddress: profile.legal_address || '',
      email: profile.email || null,
      defaultCurrency: profile.default_currency || 'GEL',
      defaultPaymentTerms: profile.default_payment_terms || null,
      customTypstTemplate: profile.custom_typst_template || null,
    })
  }
}

export async function ensureProfileId(): Promise<number> {
  const profile = await getProfile()
  if (profile) return profile.id

  await saveProfile({ business_name: '', tax_id: '', legal_address: '', default_currency: 'GEL' })
  const newProfile = await getProfile()
  return newProfile ? newProfile.id : 1
}

// ----------------- Bank Accounts -----------------
export async function getBankAccounts(): Promise<BankAccount[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(schema.bankAccounts)
    .orderBy(desc(schema.bankAccounts.isDefault), desc(schema.bankAccounts.id))

  return rows.map((b) => ({
    id: b.id,
    profile_id: b.profileId,
    account_label: b.accountLabel,
    beneficiary_name: b.beneficiaryName,
    bank_name: b.bankName,
    bank_address: b.bankAddress || undefined,
    iban: b.iban,
    swift_bic: b.swiftBic,
    intermediary_bank_name: b.intermediaryBankName || undefined,
    intermediary_swift: b.intermediarySwift || undefined,
    is_default: Boolean(b.isDefault),
  }))
}

export async function saveBankAccount(account: Partial<BankAccount>): Promise<void> {
  const db = await getDb()
  const profileId = await ensureProfileId()

  if (account.is_default) {
    await db.update(schema.bankAccounts).set({ isDefault: false })
  }

  if (account.id) {
    await db
      .update(schema.bankAccounts)
      .set({
        accountLabel: account.account_label || '',
        beneficiaryName: account.beneficiary_name || '',
        bankName: account.bank_name || '',
        bankAddress: account.bank_address || null,
        iban: account.iban || '',
        swiftBic: account.swift_bic || '',
        intermediaryBankName: account.intermediary_bank_name || null,
        intermediarySwift: account.intermediary_swift || null,
        isDefault: Boolean(account.is_default),
      })
      .where(eq(schema.bankAccounts.id, account.id))
  } else {
    await db.insert(schema.bankAccounts).values({
      profileId,
      accountLabel: account.account_label || '',
      beneficiaryName: account.beneficiary_name || '',
      bankName: account.bank_name || '',
      bankAddress: account.bank_address || null,
      iban: account.iban || '',
      swiftBic: account.swift_bic || '',
      intermediaryBankName: account.intermediary_bank_name || null,
      intermediarySwift: account.intermediary_swift || null,
      isDefault: Boolean(account.is_default),
    })
  }
}

export async function deleteBankAccount(id: number): Promise<void> {
  const db = await getDb()
  const linkedInvoices = await db
    .select({ id: schema.invoices.id })
    .from(schema.invoices)
    .where(eq(schema.invoices.bankAccountId, id))

  if (linkedInvoices.length > 0) {
    throw new Error('Cannot delete bank account because it is associated with existing invoices.')
  }

  await db.delete(schema.bankAccounts).where(eq(schema.bankAccounts.id, id))
}

// ----------------- Counterparties (Buyers) -----------------
export async function getCounterparties(): Promise<Counterparty[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(schema.counterparties)
    .orderBy(asc(schema.counterparties.businessName))

  return rows.map((c) => ({
    id: c.id,
    business_name: c.businessName,
    tax_id: c.taxId,
    director_name: c.directorName || undefined,
    legal_address: c.legalAddress,
    actual_address: c.actualAddress || undefined,
    email: c.email || undefined,
    created_at: c.createdAt || undefined,
  }))
}

export async function saveCounterparty(counterparty: Partial<Counterparty>): Promise<number> {
  const db = await getDb()

  if (counterparty.id) {
    await db
      .update(schema.counterparties)
      .set({
        businessName: counterparty.business_name || '',
        taxId: counterparty.tax_id || '',
        directorName: counterparty.director_name || null,
        legalAddress: counterparty.legal_address || '',
        actualAddress: counterparty.actual_address || null,
        email: counterparty.email || null,
      })
      .where(eq(schema.counterparties.id, counterparty.id))
    return counterparty.id
  } else {
    await db.insert(schema.counterparties).values({
      businessName: counterparty.business_name || '',
      taxId: counterparty.tax_id || '',
      directorName: counterparty.director_name || null,
      legalAddress: counterparty.legal_address || '',
      actualAddress: counterparty.actual_address || null,
      email: counterparty.email || null,
    })
    const latest = await db
      .select({ id: schema.counterparties.id })
      .from(schema.counterparties)
      .orderBy(desc(schema.counterparties.id))
      .limit(1)
    return latest[0].id
  }
}

export async function deleteCounterparty(id: number): Promise<void> {
  const db = await getDb()
  const linkedInvoices = await db
    .select({ id: schema.invoices.id })
    .from(schema.invoices)
    .where(eq(schema.invoices.counterpartyId, id))

  if (linkedInvoices.length > 0) {
    throw new Error('Cannot delete counterparty because it is associated with existing invoices.')
  }

  await db.delete(schema.counterparties).where(eq(schema.counterparties.id, id))
}

// ----------------- Invoices & Items -----------------
export async function getNextInvoiceNumber(issueDateStr?: string): Promise<string> {
  const db = await getDb()
  const rows = await db
    .select({ invoiceNumber: schema.invoices.invoiceNumber })
    .from(schema.invoices)
    .orderBy(desc(schema.invoices.id))

  const dateObj = issueDateStr ? new Date(issueDateStr) : new Date()
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const prefix = `INV-${year}${month}-`

  let maxSeq = 0
  for (const r of rows) {
    if (r.invoiceNumber && r.invoiceNumber.startsWith(prefix)) {
      const seqStr = r.invoiceNumber.replace(prefix, '')
      const seqNum = parseInt(seqStr, 10)
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(2, '0')
  return `${prefix}${nextSeq}`
}

export async function getInvoices(filters?: {
  startDate?: string
  endDate?: string
  counterpartyId?: number
  status?: InvoiceStatus | 'ALL'
}): Promise<InvoiceWithDetails[]> {
  const db = await getDb()
  let rows = await db.query.invoices.findMany({
    with: {
      counterparty: true,
      bankAccount: true,
      items: true,
    },
    orderBy: [desc(schema.invoices.id)],
  })

  if (filters) {
    if (filters.startDate) {
      rows = rows.filter((r) => r.issueDate >= filters.startDate!)
    }
    if (filters.endDate) {
      rows = rows.filter((r) => r.issueDate <= filters.endDate!)
    }
    if (filters.counterpartyId) {
      rows = rows.filter((r) => r.counterpartyId === filters.counterpartyId)
    }
    if (filters.status && filters.status !== 'ALL') {
      rows = rows.filter((r) => r.status === filters.status)
    }
  }

  return rows.map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    issue_date: inv.issueDate,
    due_date: inv.dueDate || undefined,
    paid_date: inv.paidDate || undefined,
    counterparty_id: inv.counterpartyId,
    bank_account_id: inv.bankAccountId,
    currency: inv.currency as Currency,
    total_amount: inv.totalAmount,
    amount_in_words: inv.amountInWords,
    notes: inv.notes || undefined,
    status: (inv.status as InvoiceStatus) || 'ISSUED',
    created_at: inv.createdAt || undefined,
    counterparty: inv.counterparty
      ? {
          id: inv.counterparty.id,
          business_name: inv.counterparty.businessName,
          tax_id: inv.counterparty.taxId,
          director_name: inv.counterparty.directorName || undefined,
          legal_address: inv.counterparty.legalAddress,
          actual_address: inv.counterparty.actualAddress || undefined,
          email: inv.counterparty.email || undefined,
        }
      : undefined,
    bank_account: inv.bankAccount
      ? {
          id: inv.bankAccount.id,
          profile_id: inv.bankAccount.profileId,
          account_label: inv.bankAccount.accountLabel,
          beneficiary_name: inv.bankAccount.beneficiaryName,
          bank_name: inv.bankAccount.bankName,
          bank_address: inv.bankAccount.bankAddress || undefined,
          iban: inv.bankAccount.iban,
          swift_bic: inv.bankAccount.swiftBic,
          intermediary_bank_name: inv.bankAccount.intermediaryBankName || undefined,
          intermediary_swift: inv.bankAccount.intermediarySwift || undefined,
          is_default: Boolean(inv.bankAccount.isDefault),
        }
      : undefined,
    items: (inv.items || []).map((it) => ({
      id: it.id,
      invoice_id: it.invoiceId,
      item_order: it.itemOrder,
      description: it.description,
      unit: it.unit,
      unit_price: it.unitPrice,
      quantity: it.quantity,
      amount: it.amount,
    })),
  }))
}

export async function saveInvoice(invoice: Partial<Invoice>, items: any[]): Promise<number> {
  const db = await getDb()
  let invoiceId = invoice.id

  if (invoiceId) {
    await db
      .update(schema.invoices)
      .set({
        invoiceNumber: invoice.invoice_number || '',
        issueDate: invoice.issue_date || '',
        dueDate: invoice.due_date || null,
        paidDate: invoice.paid_date || null,
        counterpartyId: invoice.counterparty_id!,
        bankAccountId: invoice.bank_account_id!,
        currency: invoice.currency || 'GEL',
        totalAmount: invoice.total_amount || 0,
        amountInWords: invoice.amount_in_words || '',
        notes: invoice.notes || null,
        status: invoice.status || 'ISSUED',
      })
      .where(eq(schema.invoices.id, invoiceId))

    await db.delete(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, invoiceId))
  } else {
    await db.insert(schema.invoices).values({
      invoiceNumber: invoice.invoice_number || '',
      issueDate: invoice.issue_date || '',
      dueDate: invoice.due_date || null,
      paidDate: invoice.paid_date || null,
      counterpartyId: invoice.counterparty_id!,
      bankAccountId: invoice.bank_account_id!,
      currency: invoice.currency || 'GEL',
      totalAmount: invoice.total_amount || 0,
      amountInWords: invoice.amount_in_words || '',
      notes: invoice.notes || null,
      status: invoice.status || 'ISSUED',
    })
    const latest = await db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .orderBy(desc(schema.invoices.id))
      .limit(1)
    invoiceId = latest[0].id
  }

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    await db.insert(schema.invoiceItems).values({
      invoiceId: invoiceId!,
      itemOrder: idx + 1,
      description: item.description || '',
      unit: item.unit || 'unit',
      unitPrice: item.unit_price || 0,
      quantity: item.quantity || 1,
      amount: item.amount || 0,
    })
  }

  // Trigger background Drive sync if connected
  autoSyncGoogleDriveIfConnected()

  return invoiceId!
}

export async function deleteInvoice(id: number): Promise<void> {
  const db = await getDb()
  await db.delete(schema.invoiceItems).where(eq(schema.invoiceItems.invoiceId, id))
  await db.delete(schema.invoices).where(eq(schema.invoices.id, id))
  autoSyncGoogleDriveIfConnected()
}

export async function updateInvoiceStatus(
  id: number,
  status: InvoiceStatus,
  paidDate?: string
): Promise<void> {
  const db = await getDb()
  const finalPaidDate = status === 'PAID' ? paidDate || new Date().toISOString().split('T')[0] : null
  await db
    .update(schema.invoices)
    .set({ status, paidDate: finalPaidDate })
    .where(eq(schema.invoices.id, id))
  autoSyncGoogleDriveIfConnected()
}
