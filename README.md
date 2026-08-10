# Privacy-First Desktop Invoice Generator

A lightweight, privacy-first desktop application for generating, tracking, and exporting professional invoices. Built with **Tauri V2 (Rust)**, **React 19 (TypeScript)**, **Tailwind CSS v4 + shadcn/ui**, **SQLite**, and **Typst PDF Engine**.

---

## Features

- 🔒 **Privacy-First & On-Device Storage**: All seller profiles, bank accounts, counterparties, and invoice ledgers are stored locally in an embedded SQLite database (`invoices.db`). Zero external cloud tracking or telemetry.
- ⚡ **Ultra-Fast Typst PDF Engine**: Native Rust PDF generation command utilizing the `typst` CLI engine to render vector-sharp, publication-quality A4 invoices in milliseconds.
- 📆 **Daily Sequence Numbering (`YYYYMMDD-XX`)**: Auto-incrementing daily sequence numbers that automatically reset to `-01` on new dates (e.g. `20260810-01`, `20260810-02`).
- 🔤 **English Number-to-Words Engine**: Client-side numeric converter formatting invoice grand totals into formal spelled-out English text (e.g., `1400.00 GEL` → `"One thousand four hundred GEL"`, `6810.00 EUR` → `"Six thousand eight hundred ten EUR"`).
- ✍️ **Dynamic Signature Block**: Signature lines for both Seller (Left) and Buyer (Right) rendered on invoices.
- 🏦 **Multi-Bank Account Directory**: Manage multiple seller bank accounts (GEL, EUR, USD, GBP) with IBAN, SWIFT, and optional Intermediary Bank/SWIFT details.
- 👥 **Counterparty Directory & Inline Creation**: Searchable buyer directory with auto-complete lookup and quick inline modal creation during invoice editing.
- 📊 **Invoices Ledger & Filter Engine**: Filter invoices by date range, counterparty buyer, or payment status (`ISSUED`, `PAID`, `DRAFT`, `CANCELLED`).
- ☁️ **Google Drive PKCE Cloud Backup**: Optional Google OAuth2 PKCE login flow (`https://www.googleapis.com/auth/drive.file`) to upload generated invoice PDFs directly into Google Drive with 1 click.

---

## Tech Stack

| Tier | Technology | Description |
| --- | --- | --- |
| **Desktop Framework** | [Tauri V2](https://tauri.app) | Lightweight, memory-efficient Rust desktop container |
| **Frontend Framework** | [React 19](https://react.dev) + TypeScript | Modern reactive UI |
| **Styling & UI Primitives**| [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) | Obsidian & Slate porcelain themes |
| **State Management** | [TanStack Query](https://tanstack.com/query) + [Zustand](https://zustand-demo.pmnd.rs) | Reactive state & data fetching |
| **Database** | SQLite via `tauri-plugin-sql` | Local embedded database with auto-migrations |
| **PDF Engine** | [Typst CLI v0.15+](https://typst.app) | High-performance markup markup-to-PDF compiler |

---

## Prerequisites & Installation

### 1. Prerequisites
- **Node.js**: v18+ and `npm`
- **Rust**: `rustc` & `cargo` installed via [rustup.rs](https://rustup.rs)
- **Typst CLI**: `typst` binary installed (e.g., via `brew install typst` or `cargo install typst-cli`)

### 2. Quick Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/invoice-generator.git
cd invoice-generator

# 2. Install NPM dependencies
npm install

# 3. Check Rust backend code
cargo check --manifest-path src-tauri/Cargo.toml

# 4. Launch in Tauri Development Mode
npm run tauri dev
```

---

## Database Schema (SQLite)

App data is initialized automatically in `$APP_DATA_DIR/invoices.db` using Tauri migrations:

- **`profiles`**: Seller legal entity details (Business Name, Tax ID, Legal Address, Default Currency).
- **`bank_accounts`**: Multi-bank account directory (Account Label, Beneficiary Name, Bank Name, Address, IBAN, SWIFT, Intermediary Bank/SWIFT, Default flag).
- **`counterparties`**: Client/Buyer directory (Business Name, Tax ID, Director Name, Legal Address, Actual Address).
- **`invoices`**: Main invoice records (`invoice_number`, `issue_date`, `due_date`, `counterparty_id`, `bank_account_id`, `currency`, `total_amount`, `amount_in_words`, `notes`, `status`).
- **`invoice_items`**: Line items linked to invoices (`description`, `unit`, `unit_price`, `quantity`, `amount`).

---

## Google Drive OAuth PKCE Setup

To enable 1-click cloud backups:
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create an **OAuth 2.0 Client ID** with Application Type set to **Desktop App**.
3. Enable the **Google Drive API** in your Google Cloud Project.
4. Copy your Client ID into **Settings & Bank Accounts** inside the app.
5. Click **Login with Google Drive (PKCE)**. A local loopback listener (`http://127.0.0.1:9876/callback`) will capture the authorization code securely.

---

## Building Desktop Executables

To package production binaries (macOS `.dmg` / `.app`, Windows `.msi` / `.exe`, Linux `.deb` / `.AppImage`):

```bash
npm run tauri build
```

The resulting binaries will be saved in `src-tauri/target/release/bundle/`.

---

## License

Distributed under the MIT License.
