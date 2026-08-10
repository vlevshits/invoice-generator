import Database from '@tauri-apps/plugin-sql'
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
import { runMigrations } from '@/lib/migrator'

let dbInstance: Database | null = null
let migrationsPromise: Promise<void> | null = null

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:invoices.db')
    try {
      await dbInstance.select('PRAGMA journal_mode = WAL;')
      await dbInstance.select('PRAGMA busy_timeout = 5000;')
    } catch (e) {
      console.warn('Failed to set SQLite PRAGMAs:', e)
    }
  }
  if (!migrationsPromise) {
    migrationsPromise = runMigrations(dbInstance)
  }
  await migrationsPromise
  return dbInstance
}

export async function getRawDb(): Promise<Database> {
  return getDb()
}

// ----------------- Profile -----------------
export async function getProfile(): Promise<Profile | null> {
  const db = await getDb()
  const rows = await db.select<any[]>('SELECT * FROM profiles ORDER BY id ASC LIMIT 1')
  if (!rows || rows.length === 0) return null

  const p = rows[0]
  return {
    id: p.id,
    business_name: p.business_name,
    tax_id: p.tax_id,
    legal_address: p.legal_address,
    email: p.email || undefined,
    default_currency: p.default_currency as Currency,
    default_payment_terms: p.default_payment_terms || undefined,
    custom_typst_template: p.custom_typst_template || undefined,
    created_at: p.created_at || undefined,
  }
}

export async function saveProfile(profile: Partial<Profile>): Promise<void> {
  const db = await getDb()
  const existing = await getProfile()

  if (existing) {
    await db.execute(
      `UPDATE profiles SET
        business_name = $1,
        tax_id = $2,
        legal_address = $3,
        email = $4,
        default_currency = $5,
        default_payment_terms = $6,
        custom_typst_template = $7
       WHERE id = $8`,
      [
        profile.business_name || '',
        profile.tax_id || '',
        profile.legal_address || '',
        profile.email || null,
        profile.default_currency || 'GEL',
        profile.default_payment_terms || null,
        profile.custom_typst_template || null,
        existing.id,
      ]
    )
  } else {
    await db.execute(
      `INSERT INTO profiles (business_name, tax_id, legal_address, email, default_currency, default_payment_terms, custom_typst_template)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        profile.business_name || '',
        profile.tax_id || '',
        profile.legal_address || '',
        profile.email || null,
        profile.default_currency || 'GEL',
        profile.default_payment_terms || null,
        profile.custom_typst_template || null,
      ]
    )
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
  const rows = await db.select<any[]>(
    'SELECT * FROM bank_accounts ORDER BY is_default DESC, id DESC'
  )
  return (rows || []).map((b) => ({
    id: b.id,
    profile_id: b.profile_id,
    account_label: b.account_label,
    beneficiary_name: b.beneficiary_name,
    bank_name: b.bank_name,
    bank_address: b.bank_address || undefined,
    iban: b.iban,
    swift_bic: b.swift_bic,
    intermediary_bank_name: b.intermediary_bank_name || undefined,
    intermediary_swift: b.intermediary_swift || undefined,
    is_default: Boolean(b.is_default),
  }))
}

export async function saveBankAccount(account: Partial<BankAccount>): Promise<void> {
  const db = await getDb()
  const profileId = await ensureProfileId()

  if (account.is_default) {
    await db.execute('UPDATE bank_accounts SET is_default = 0')
  }

  if (account.id) {
    await db.execute(
      `UPDATE bank_accounts SET
        account_label = $1,
        beneficiary_name = $2,
        bank_name = $3,
        bank_address = $4,
        iban = $5,
        swift_bic = $6,
        intermediary_bank_name = $7,
        intermediary_swift = $8,
        is_default = $9
       WHERE id = $10`,
      [
        account.account_label || '',
        account.beneficiary_name || '',
        account.bank_name || '',
        account.bank_address || null,
        account.iban || '',
        account.swift_bic || '',
        account.intermediary_bank_name || null,
        account.intermediary_swift || null,
        account.is_default ? 1 : 0,
        account.id,
      ]
    )
  } else {
    await db.execute(
      `INSERT INTO bank_accounts (profile_id, account_label, beneficiary_name, bank_name, bank_address, iban, swift_bic, intermediary_bank_name, intermediary_swift, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        profileId,
        account.account_label || '',
        account.beneficiary_name || '',
        account.bank_name || '',
        account.bank_address || null,
        account.iban || '',
        account.swift_bic || '',
        account.intermediary_bank_name || null,
        account.intermediary_swift || null,
        account.is_default ? 1 : 0,
      ]
    )
  }
}

export async function deleteBankAccount(id: number): Promise<void> {
  const db = await getDb()
  const linked = await db.select<any[]>(
    'SELECT id FROM invoices WHERE bank_account_id = $1 LIMIT 1',
    [id]
  )
  if (linked && linked.length > 0) {
    throw new Error('Cannot delete bank account because it is associated with existing invoices.')
  }
  await db.execute('DELETE FROM bank_accounts WHERE id = $1', [id])
}

// ----------------- Counterparties (Buyers) -----------------
export async function getCounterparties(): Promise<Counterparty[]> {
  const db = await getDb()
  const rows = await db.select<any[]>(
    'SELECT * FROM counterparties ORDER BY business_name ASC'
  )
  return (rows || []).map((c) => ({
    id: c.id,
    business_name: c.business_name,
    tax_id: c.tax_id,
    director_name: c.director_name || undefined,
    legal_address: c.legal_address,
    actual_address: c.actual_address || undefined,
    email: c.email || undefined,
    created_at: c.created_at || undefined,
  }))
}

export async function saveCounterparty(counterparty: Partial<Counterparty>): Promise<number> {
  const db = await getDb()

  if (counterparty.id) {
    await db.execute(
      `UPDATE counterparties SET
        business_name = $1,
        tax_id = $2,
        director_name = $3,
        legal_address = $4,
        actual_address = $5,
        email = $6
       WHERE id = $7`,
      [
        counterparty.business_name || '',
        counterparty.tax_id || '',
        counterparty.director_name || null,
        counterparty.legal_address || '',
        counterparty.actual_address || null,
        counterparty.email || null,
        counterparty.id,
      ]
    )
    return counterparty.id
  } else {
    await db.execute(
      `INSERT INTO counterparties (business_name, tax_id, director_name, legal_address, actual_address, email)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        counterparty.business_name || '',
        counterparty.tax_id || '',
        counterparty.director_name || null,
        counterparty.legal_address || '',
        counterparty.actual_address || null,
        counterparty.email || null,
      ]
    )
    const latest = await db.select<any[]>('SELECT id FROM counterparties ORDER BY id DESC LIMIT 1')
    return latest[0].id
  }
}

export async function deleteCounterparty(id: number): Promise<void> {
  const db = await getDb()
  const linked = await db.select<any[]>(
    'SELECT id FROM invoices WHERE counterparty_id = $1 LIMIT 1',
    [id]
  )
  if (linked && linked.length > 0) {
    throw new Error('Cannot delete counterparty because it is associated with existing invoices.')
  }
  await db.execute('DELETE FROM counterparties WHERE id = $1', [id])
}

// ----------------- Invoices & Items -----------------
export async function getNextInvoiceNumber(issueDateStr?: string): Promise<string> {
  const db = await getDb()
  const rows = await db.select<any[]>('SELECT invoice_number FROM invoices ORDER BY id DESC')

  const dateObj = issueDateStr ? new Date(issueDateStr) : new Date()
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const prefix = `INV-${year}${month}-`

  let maxSeq = 0
  for (const r of rows || []) {
    if (r.invoice_number && r.invoice_number.startsWith(prefix)) {
      const seqStr = r.invoice_number.replace(prefix, '')
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

  let query = 'SELECT * FROM invoices'
  const conditions: string[] = []
  const params: any[] = []

  if (filters) {
    if (filters.startDate) {
      conditions.push(`issue_date >= $${params.length + 1}`)
      params.push(filters.startDate)
    }
    if (filters.endDate) {
      conditions.push(`issue_date <= $${params.length + 1}`)
      params.push(filters.endDate)
    }
    if (filters.counterpartyId) {
      conditions.push(`counterparty_id = $${params.length + 1}`)
      params.push(filters.counterpartyId)
    }
    if (filters.status && filters.status !== 'ALL') {
      conditions.push(`status = $${params.length + 1}`)
      params.push(filters.status)
    }
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ')
  }
  query += ' ORDER BY id DESC'

  const invoiceRows = await db.select<any[]>(query, params)
  if (!invoiceRows || invoiceRows.length === 0) return []

  const counterparties = await getCounterparties()
  const bankAccounts = await getBankAccounts()
  const cpMap = new Map(counterparties.map((c) => [c.id, c]))
  const baMap = new Map(bankAccounts.map((b) => [b.id, b]))

  const allItems = await db.select<any[]>('SELECT * FROM invoice_items ORDER BY item_order ASC')
  const itemsByInvoiceId = new Map<number, any[]>()
  for (const it of allItems || []) {
    if (!itemsByInvoiceId.has(it.invoice_id)) {
      itemsByInvoiceId.set(it.invoice_id, [])
    }
    itemsByInvoiceId.get(it.invoice_id)!.push(it)
  }

  return invoiceRows.map((inv) => {
    const rawItems = itemsByInvoiceId.get(inv.id) || []
    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      issue_date: inv.issue_date,
      due_date: inv.due_date || undefined,
      paid_date: inv.paid_date || undefined,
      counterparty_id: inv.counterparty_id,
      bank_account_id: inv.bank_account_id,
      currency: inv.currency as Currency,
      total_amount: inv.total_amount,
      amount_in_words: inv.amount_in_words,
      notes: inv.notes || undefined,
      status: (inv.status as InvoiceStatus) || 'ISSUED',
      created_at: inv.created_at || undefined,
      counterparty: cpMap.get(inv.counterparty_id),
      bank_account: baMap.get(inv.bank_account_id),
      items: rawItems.map((it) => ({
        id: it.id,
        invoice_id: it.invoice_id,
        item_order: it.item_order,
        description: it.description,
        unit: it.unit,
        unit_price: it.unit_price,
        quantity: it.quantity,
        amount: it.amount,
      })),
    }
  })
}

export async function saveInvoice(invoice: Partial<Invoice>, items: any[]): Promise<number> {
  const db = await getDb()
  let invoiceId = invoice.id

  if (invoiceId) {
    await db.execute(
      `UPDATE invoices SET
        invoice_number = $1,
        issue_date = $2,
        due_date = $3,
        paid_date = $4,
        counterparty_id = $5,
        bank_account_id = $6,
        currency = $7,
        total_amount = $8,
        amount_in_words = $9,
        notes = $10,
        status = $11
       WHERE id = $12`,
      [
        invoice.invoice_number || '',
        invoice.issue_date || '',
        invoice.due_date || null,
        invoice.paid_date || null,
        invoice.counterparty_id!,
        invoice.bank_account_id!,
        invoice.currency || 'GEL',
        invoice.total_amount || 0,
        invoice.amount_in_words || '',
        invoice.notes || null,
        invoice.status || 'ISSUED',
        invoiceId,
      ]
    )
  } else {
    await db.execute(
      `INSERT INTO invoices (invoice_number, issue_date, due_date, paid_date, counterparty_id, bank_account_id, currency, total_amount, amount_in_words, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        invoice.invoice_number || '',
        invoice.issue_date || '',
        invoice.due_date || null,
        invoice.paid_date || null,
        invoice.counterparty_id!,
        invoice.bank_account_id!,
        invoice.currency || 'GEL',
        invoice.total_amount || 0,
        invoice.amount_in_words || '',
        invoice.notes || null,
        invoice.status || 'ISSUED',
      ]
    )
    const latest = await db.select<any[]>('SELECT id FROM invoices ORDER BY id DESC LIMIT 1')
    invoiceId = latest[0].id
  }

  // Always delete existing items for invoiceId before inserting new item list
  await db.execute('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId])

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx]
    await db.execute(
      `INSERT INTO invoice_items (invoice_id, item_order, description, unit, unit_price, quantity, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        invoiceId,
        idx + 1,
        item.description || '',
        item.unit || 'unit',
        item.unit_price || 0,
        item.quantity || 1,
        item.amount || 0,
      ]
    )
  }

  // Trigger background Drive sync if connected
  autoSyncGoogleDriveIfConnected()

  return invoiceId!
}

export async function deleteInvoice(id: number): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM invoice_items WHERE invoice_id = $1', [id])
  await db.execute('DELETE FROM invoices WHERE id = $1', [id])
  autoSyncGoogleDriveIfConnected()
}

export async function updateInvoiceStatus(
  id: number,
  status: InvoiceStatus,
  paidDate?: string
): Promise<void> {
  const db = await getDb()
  const finalPaidDate = status === 'PAID' ? paidDate || new Date().toISOString().split('T')[0] : null
  await db.execute(
    'UPDATE invoices SET status = $1, paid_date = $2 WHERE id = $3',
    [status, finalPaidDate, id]
  )
  autoSyncGoogleDriveIfConnected()
}
