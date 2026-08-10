CREATE TABLE IF NOT EXISTS `profiles` (
	`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_name` TEXT NOT NULL,
	`tax_id` TEXT NOT NULL,
	`legal_address` TEXT NOT NULL,
	`email` TEXT,
	`default_currency` TEXT DEFAULT 'GEL' NOT NULL,
	`default_payment_terms` TEXT,
	`custom_typst_template` TEXT,
	`created_at` TEXT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `bank_accounts` (
	`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` INTEGER NOT NULL,
	`account_label` TEXT NOT NULL,
	`beneficiary_name` TEXT NOT NULL,
	`bank_name` TEXT NOT NULL,
	`bank_address` TEXT,
	`iban` TEXT NOT NULL,
	`swift_bic` TEXT NOT NULL,
	`intermediary_bank_name` TEXT,
	`intermediary_swift` TEXT,
	`is_default` INTEGER DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `counterparties` (
	`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_name` TEXT NOT NULL,
	`tax_id` TEXT NOT NULL,
	`director_name` TEXT,
	`legal_address` TEXT NOT NULL,
	`actual_address` TEXT,
	`email` TEXT,
	`created_at` TEXT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `invoices` (
	`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` TEXT NOT NULL,
	`issue_date` TEXT NOT NULL,
	`due_date` TEXT,
	`paid_date` TEXT,
	`counterparty_id` INTEGER NOT NULL,
	`bank_account_id` INTEGER NOT NULL,
	`currency` TEXT NOT NULL,
	`total_amount` REAL NOT NULL,
	`amount_in_words` TEXT NOT NULL,
	`notes` TEXT,
	`status` TEXT DEFAULT 'ISSUED',
	`created_at` TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `invoice_items` (
	`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` INTEGER NOT NULL,
	`item_order` INTEGER NOT NULL,
	`description` TEXT NOT NULL,
	`unit` TEXT NOT NULL,
	`unit_price` REAL NOT NULL,
	`quantity` REAL NOT NULL,
	`amount` REAL NOT NULL
);
