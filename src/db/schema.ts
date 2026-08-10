import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessName: text('business_name').notNull(),
  taxId: text('tax_id').notNull(),
  legalAddress: text('legal_address').notNull(),
  defaultCurrency: text('default_currency').notNull().default('GEL'),
  defaultPaymentTerms: text('default_payment_terms'),
  customTypstTemplate: text('custom_typst_template'),
  createdAt: text('created_at'),
})

export const bankAccounts = sqliteTable('bank_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id').notNull(),
  accountLabel: text('account_label').notNull(),
  beneficiaryName: text('beneficiary_name').notNull(),
  bankName: text('bank_name').notNull(),
  bankAddress: text('bank_address'),
  iban: text('iban').notNull(),
  swiftBic: text('swift_bic').notNull(),
  intermediaryBankName: text('intermediary_bank_name'),
  intermediarySwift: text('intermediary_swift'),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false),
})

export const counterparties = sqliteTable('counterparties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  businessName: text('business_name').notNull(),
  taxId: text('tax_id').notNull(),
  directorName: text('director_name'),
  legalAddress: text('legal_address').notNull(),
  actualAddress: text('actual_address'),
  createdAt: text('created_at'),
})

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date'),
  counterpartyId: integer('counterparty_id').notNull(),
  bankAccountId: integer('bank_account_id').notNull(),
  currency: text('currency').notNull(),
  totalAmount: real('total_amount').notNull(),
  amountInWords: text('amount_in_words').notNull(),
  notes: text('notes'),
  status: text('status').default('ISSUED'),
  createdAt: text('created_at'),
})

export const invoiceItems = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').notNull(),
  itemOrder: integer('item_order').notNull(),
  description: text('description').notNull(),
  unit: text('unit').notNull(),
  unitPrice: real('unit_price').notNull(),
  quantity: real('quantity').notNull(),
  amount: real('amount').notNull(),
})

// Drizzle Relations
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  counterparty: one(counterparties, {
    fields: [invoices.counterpartyId],
    references: [counterparties.id],
  }),
  bankAccount: one(bankAccounts, {
    fields: [invoices.bankAccountId],
    references: [bankAccounts.id],
  }),
  items: many(invoiceItems),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}))
