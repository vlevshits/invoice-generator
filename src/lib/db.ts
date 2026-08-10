import Database from '@tauri-apps/plugin-sql'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import * as schema from '@/db/schema'
import type {
  Profile,
  BankAccount,
  Counterparty,
  Invoice,
  InvoiceItem,
  InvoiceWithDetails,
  InvoiceStatus,
  Currency,
} from '@/types'

let rawDbInstance: Database | null = null
let drizzleDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export async function getRawDb(): Promise<Database> {
  if (!rawDbInstance) {
    rawDbInstance = await Database.load('sqlite:invoices.db')
  }
  return rawDbInstance
}

export async function getDb() {
  if (!drizzleDbInstance) {
    const tauriDb = await getRawDb()
    drizzleDbInstance = drizzle<typeof schema>(
      async (sql, params, method) => {
        try {
          if (method === 'run') {
            const res = await tauriDb.execute(sql, params)
            return { rows: [], lastInsertRowid: res.lastInsertId }
          }
          const rows = await tauriDb.select<any[]>(sql, params)
          if (method === 'get') {
            return { rows: rows.length > 0 ? [Object.values(rows[0])] : [] }
          }
          return { rows: rows.map((r) => Object.values(r)) }
        } catch (e: any) {
          console.error('Drizzle SQLite Proxy error:', e)
          throw e
        }
      },
      { schema }
    )
  }
  return drizzleDbInstance
}

// ----------------- Profile -----------------
export async function getProfile(): Promise<Profile | null> {
  const tauriDb = await getRawDb()
  const rows = await tauriDb.select<any[]>('SELECT * FROM profiles ORDER BY id ASC LIMIT 1')
  if (rows.length === 0) return null

  const r = rows[0]
  return {
    id: r.id,
    business_name: r.business_name,
    tax_id: r.tax_id,
    legal_address: r.legal_address,
    default_currency: r.default_currency as Currency,
    default_payment_terms: r.default_payment_terms || undefined,
    created_at: r.created_at,
  }
}

export async function saveProfile(profile: Partial<Profile>): Promise<void> {
  const tauriDb = await getRawDb()
  const existing = await getProfile()

  if (existing) {
    await tauriDb.execute(
      `UPDATE profiles SET business_name = $1, tax_id = $2, legal_address = $3, default_currency = $4, default_payment_terms = $5 WHERE id = $6`,
      [
        profile.business_name,
        profile.tax_id,
        profile.legal_address,
        profile.default_currency || 'GEL',
        profile.default_payment_terms || null,
        existing.id,
      ]
    )
  } else {
    await tauriDb.execute(
      `INSERT INTO profiles (business_name, tax_id, legal_address, default_currency, default_payment_terms) VALUES ($1, $2, $3, $4, $5)`,
      [
        profile.business_name || '',
        profile.tax_id || '',
        profile.legal_address || '',
        profile.default_currency || 'GEL',
        profile.default_payment_terms || null,
      ]
    )
  }
}

// ----------------- Bank Accounts -----------------
export async function getBankAccounts(): Promise<BankAccount[]> {
  const tauriDb = await getRawDb()
  const rows = await tauriDb.select<any[]>(
    'SELECT * FROM bank_accounts ORDER BY is_default DESC, id DESC'
  )
  return rows.map((r) => ({
    id: r.id,
    profile_id: r.profile_id,
    account_label: r.account_label,
    beneficiary_name: r.beneficiary_name,
    bank_name: r.bank_name,
    bank_address: r.bank_address,
    iban: r.iban,
    swift_bic: r.swift_bic,
    intermediary_bank_name: r.intermediary_bank_name,
    intermediary_swift: r.intermediary_swift,
    is_default: Boolean(r.is_default),
  }))
}

export async function saveBankAccount(account: Partial<BankAccount>): Promise<void> {
  const tauriDb = await getRawDb()
  const profile = await getProfile()
  const profileId = profile ? profile.id : 1

  if (account.is_default) {
    await tauriDb.execute('UPDATE bank_accounts SET is_default = 0')
  }

  if (account.id) {
    await tauriDb.execute(
      `UPDATE bank_accounts SET
        account_label = $1, beneficiary_name = $2, bank_name = $3, bank_address = $4,
        iban = $5, swift_bic = $6, intermediary_bank_name = $7, intermediary_swift = $8, is_default = $9
       WHERE id = $10`,
      [
        account.account_label,
        account.beneficiary_name,
        account.bank_name,
        account.bank_address || null,
        account.iban,
        account.swift_bic,
        account.intermediary_bank_name || null,
        account.intermediary_swift || null,
        account.is_default ? 1 : 0,
        account.id,
      ]
    )
  } else {
    await tauriDb.execute(
      `INSERT INTO bank_accounts (
        profile_id, account_label, beneficiary_name, bank_name, bank_address, iban, swift_bic,
        intermediary_bank_name, intermediary_swift, is_default
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        profileId,
        account.account_label,
        account.beneficiary_name,
        account.bank_name,
        account.bank_address || null,
        account.iban,
        account.swift_bic,
        account.intermediary_bank_name || null,
        account.intermediary_swift || null,
        account.is_default ? 1 : 0,
      ]
    )
  }
}

export async function deleteBankAccount(id: number): Promise<void> {
  const tauriDb = await getRawDb()
  await tauriDb.execute('DELETE FROM bank_accounts WHERE id = $1', [id])
}

// ----------------- Counterparties (Buyers) -----------------
export async function getCounterparties(): Promise<Counterparty[]> {
  const tauriDb = await getRawDb()
  const rows = await tauriDb.select<any[]>('SELECT * FROM counterparties ORDER BY business_name ASC')
  return rows.map((r) => ({
    id: r.id,
    business_name: r.business_name,
    tax_id: r.tax_id,
    director_name: r.director_name,
    legal_address: r.legal_address,
    actual_address: r.actual_address,
    created_at: r.created_at,
  }))
}

export async function saveCounterparty(counterparty: Partial<Counterparty>): Promise<number> {
  const tauriDb = await getRawDb()

  if (counterparty.id) {
    await tauriDb.execute(
      `UPDATE counterparties SET business_name = $1, tax_id = $2, director_name = $3, legal_address = $4, actual_address = $5 WHERE id = $6`,
      [
        counterparty.business_name,
        counterparty.tax_id,
        counterparty.director_name || null,
        counterparty.legal_address,
        counterparty.actual_address || null,
        counterparty.id,
      ]
    )
    return counterparty.id
  } else {
    const res = await tauriDb.execute(
      `INSERT INTO counterparties (business_name, tax_id, director_name, legal_address, actual_address) VALUES ($1, $2, $3, $4, $5)`,
      [
        counterparty.business_name,
        counterparty.tax_id,
        counterparty.director_name || null,
        counterparty.legal_address,
        counterparty.actual_address || null,
      ]
    )
    return res.lastInsertId ?? 0
  }
}

export async function deleteCounterparty(id: number): Promise<void> {
  const tauriDb = await getRawDb()
  await tauriDb.execute('DELETE FROM counterparties WHERE id = $1', [id])
}

// ----------------- Daily Invoice Number Generator -----------------
export async function getNextInvoiceNumber(dateIsoString?: string): Promise<string> {
  const targetDate = dateIsoString ? new Date(dateIsoString) : new Date()
  const yyyy = targetDate.getFullYear()
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0')
  const dd = String(targetDate.getDate()).padStart(2, '0')
  const datePrefix = `${yyyy}${mm}${dd}`

  const tauriDb = await getRawDb()
  const rows = await tauriDb.select<{ invoice_number: string }[]>(
    `SELECT invoice_number FROM invoices WHERE invoice_number LIKE $1 ORDER BY invoice_number DESC LIMIT 1`,
    [`${datePrefix}-%`]
  )

  if (rows.length === 0) {
    return `${datePrefix}-01`
  }

  const lastNum = rows[0].invoice_number
  const parts = lastNum.split('-')
  if (parts.length === 2) {
    const seq = parseInt(parts[1], 10)
    if (!isNaN(seq)) {
      const nextSeq = String(seq + 1).padStart(2, '0')
      return `${datePrefix}-${nextSeq}`
    }
  }

  return `${datePrefix}-01`
}

// ----------------- Invoices Ledger & Items -----------------
export async function getInvoices(filters?: {
  startDate?: string
  endDate?: string
  counterpartyId?: number
  status?: InvoiceStatus | 'ALL'
}): Promise<InvoiceWithDetails[]> {
  const tauriDb = await getRawDb()

  let query = `
    SELECT
      i.*,
      c.business_name as c_business_name, c.tax_id as c_tax_id, c.director_name as c_director_name, c.legal_address as c_legal_address, c.actual_address as c_actual_address,
      b.account_label as b_account_label, b.beneficiary_name as b_beneficiary_name, b.bank_name as b_bank_name, b.bank_address as b_bank_address, b.iban as b_iban, b.swift_bic as b_swift_bic, b.intermediary_bank_name as b_intermediary_bank_name, b.intermediary_swift as b_intermediary_swift
    FROM invoices i
    LEFT JOIN counterparties c ON i.counterparty_id = c.id
    LEFT JOIN bank_accounts b ON i.bank_account_id = b.id
    WHERE 1=1
  `
  const params: any[] = []
  let paramIndex = 1

  if (filters?.startDate) {
    query += ` AND i.issue_date >= $${paramIndex++}`
    params.push(filters.startDate)
  }
  if (filters?.endDate) {
    query += ` AND i.issue_date <= $${paramIndex++}`
    params.push(filters.endDate)
  }
  if (filters?.counterpartyId) {
    query += ` AND i.counterparty_id = $${paramIndex++}`
    params.push(filters.counterpartyId)
  }
  if (filters?.status && filters.status !== 'ALL') {
    query += ` AND i.status = $${paramIndex++}`
    params.push(filters.status)
  }

  query += ` ORDER BY i.issue_date DESC, i.id DESC`

  const rows = await tauriDb.select<any[]>(query, params)

  const result: InvoiceWithDetails[] = []
  for (const r of rows) {
    const items = await tauriDb.select<InvoiceItem[]>(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY item_order ASC`,
      [r.id]
    )

    result.push({
      id: r.id,
      invoice_number: r.invoice_number,
      issue_date: r.issue_date,
      due_date: r.due_date,
      counterparty_id: r.counterparty_id,
      bank_account_id: r.bank_account_id,
      currency: r.currency as Currency,
      total_amount: r.total_amount,
      amount_in_words: r.amount_in_words,
      notes: r.notes,
      status: r.status as InvoiceStatus,
      created_at: r.created_at,
      counterparty: r.c_business_name
        ? {
            id: r.counterparty_id,
            business_name: r.c_business_name,
            tax_id: r.c_tax_id,
            director_name: r.c_director_name,
            legal_address: r.c_legal_address,
            actual_address: r.c_actual_address,
          }
        : undefined,
      bank_account: r.b_account_label
        ? {
            id: r.bank_account_id,
            profile_id: 1,
            account_label: r.b_account_label,
            beneficiary_name: r.b_beneficiary_name,
            bank_name: r.b_bank_name,
            bank_address: r.b_bank_address,
            iban: r.b_iban,
            swift_bic: r.b_swift_bic,
            intermediary_bank_name: r.b_intermediary_bank_name,
            intermediary_swift: r.b_intermediary_swift,
            is_default: false,
          }
        : undefined,
      items,
    })
  }

  return result
}

export async function saveInvoice(
  invoice: Partial<Invoice>,
  items: InvoiceItem[]
): Promise<number> {
  const tauriDb = await getRawDb()

  let invoiceId = invoice.id

  if (invoiceId) {
    await tauriDb.execute(
      `UPDATE invoices SET
        invoice_number = $1, issue_date = $2, due_date = $3, counterparty_id = $4,
        bank_account_id = $5, currency = $6, total_amount = $7, amount_in_words = $8,
        notes = $9, status = $10
       WHERE id = $11`,
      [
        invoice.invoice_number,
        invoice.issue_date,
        invoice.due_date || null,
        invoice.counterparty_id,
        invoice.bank_account_id,
        invoice.currency,
        invoice.total_amount,
        invoice.amount_in_words,
        invoice.notes || null,
        invoice.status || 'ISSUED',
        invoiceId,
      ]
    )
    await tauriDb.execute('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId])
  } else {
    const res = await tauriDb.execute(
      `INSERT INTO invoices (
        invoice_number, issue_date, due_date, counterparty_id, bank_account_id,
        currency, total_amount, amount_in_words, notes, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        invoice.invoice_number,
        invoice.issue_date,
        invoice.due_date || null,
        invoice.counterparty_id,
        invoice.bank_account_id,
        invoice.currency,
        invoice.total_amount,
        invoice.amount_in_words,
        invoice.notes || null,
        invoice.status || 'ISSUED',
      ]
    )
    invoiceId = res.lastInsertId ?? 0
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    await tauriDb.execute(
      `INSERT INTO invoice_items (invoice_id, item_order, description, unit, unit_price, quantity, amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [invoiceId, i + 1, item.description, item.unit, item.unit_price, item.quantity, item.amount]
    )
  }

  return invoiceId
}

export async function updateInvoiceStatus(id: number, status: InvoiceStatus): Promise<void> {
  const tauriDb = await getRawDb()
  await tauriDb.execute('UPDATE invoices SET status = $1 WHERE id = $2', [status, id])
}

export async function deleteInvoice(id: number): Promise<void> {
  const tauriDb = await getRawDb()
  await tauriDb.execute('DELETE FROM invoices WHERE id = $1', [id])
}
