CREATE TABLE `bank_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` integer NOT NULL,
	`account_label` text NOT NULL,
	`beneficiary_name` text NOT NULL,
	`bank_name` text NOT NULL,
	`bank_address` text,
	`iban` text NOT NULL,
	`swift_bic` text NOT NULL,
	`intermediary_bank_name` text,
	`intermediary_swift` text,
	`is_default` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `counterparties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_name` text NOT NULL,
	`tax_id` text NOT NULL,
	`director_name` text,
	`legal_address` text NOT NULL,
	`actual_address` text,
	`email` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_id` integer NOT NULL,
	`item_order` integer NOT NULL,
	`description` text NOT NULL,
	`unit` text NOT NULL,
	`unit_price` real NOT NULL,
	`quantity` real NOT NULL,
	`amount` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`invoice_number` text NOT NULL,
	`issue_date` text NOT NULL,
	`due_date` text,
	`paid_date` text,
	`counterparty_id` integer NOT NULL,
	`bank_account_id` integer NOT NULL,
	`currency` text NOT NULL,
	`total_amount` real NOT NULL,
	`amount_in_words` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'ISSUED',
	`created_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_number_unique` ON `invoices` (`invoice_number`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`business_name` text NOT NULL,
	`tax_id` text NOT NULL,
	`legal_address` text NOT NULL,
	`email` text,
	`default_currency` text DEFAULT 'GEL' NOT NULL,
	`default_payment_terms` text,
	`custom_typst_template` text,
	`created_at` text
);
