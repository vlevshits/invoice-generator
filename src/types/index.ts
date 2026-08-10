export type Currency = 'GEL' | 'EUR' | 'USD' | 'GBP'

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED'

export interface Profile {
  id: number
  business_name: string
  tax_id: string
  legal_address: string
  default_currency: Currency
  default_payment_terms?: string
  custom_typst_template?: string
  created_at?: string
}

export interface BankAccount {
  id: number
  profile_id: number
  account_label: string
  beneficiary_name: string
  bank_name: string
  bank_address?: string
  iban: string
  swift_bic: string
  intermediary_bank_name?: string
  intermediary_swift?: string
  is_default: boolean
}

export interface Counterparty {
  id: number
  business_name: string
  tax_id: string
  director_name?: string
  legal_address: string
  actual_address?: string
  created_at?: string
}

export interface InvoiceItem {
  id?: number
  invoice_id?: number
  item_order: number
  description: string
  unit: string
  unit_price: number
  quantity: number
  amount: number
}

export interface Invoice {
  id?: number
  invoice_number: string
  issue_date: string
  due_date?: string
  counterparty_id: number
  bank_account_id: number
  currency: Currency
  total_amount: number
  amount_in_words: string
  notes?: string
  status: InvoiceStatus
  created_at?: string
}

export interface InvoiceWithDetails extends Invoice {
  counterparty?: Counterparty
  bank_account?: BankAccount
  items: InvoiceItem[]
}
