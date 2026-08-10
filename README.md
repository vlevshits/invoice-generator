# Invoice Generator

A desktop application for creating, managing, and exporting professional invoices. Built with **Tauri v2**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **SQLite (Drizzle ORM)**, and **Typst CLI**.

---

## Features

- 💻 **Local On-Device Storage**: All business profiles, bank accounts, counterparties, invoices, and custom templates are stored locally in an embedded SQLite database (`invoices.db`).
- 🎨 **Typst Template System & Live Vector Preview**:
  - 4 built-in presets (*Standard Professional*, *Modern Emerald*, *Executive Indigo*, *Formal Corporate*).
  - Live vector SVG preview hot-reloading as you edit Typst markup or invoice details.
  - Custom template management: create, duplicate, edit, save, delete, and set active default templates.
- 📆 **Automatic Invoice Numbering & Status Tracking**:
  - Configurable invoice sequence reset per date (`YYYY.MM.DD-01`).
  - Invoice state transitions (`DRAFT` $\rightarrow$ `PAID` / `CANCELLED`) with payment date tracking.
- 🔤 **Amount-in-Words Engine**: Spells out numeric totals in formal English (e.g. `1400.00 GEL` $\rightarrow$ `"One thousand four hundred GEL"`).
- 🏦 **Multi-Bank Account Directory**: Store multiple bank accounts with IBAN, SWIFT/BIC, and Intermediary Bank details.
- 👥 **Counterparty Directory**: Searchable buyer list with quick inline creation.
- ☁️ **Google Drive Backup & Sheet Export**:
  - OAuth2 PKCE authentication flow using `https://www.googleapis.com/auth/drive.file`.
  - 1-click PDF upload to Google Drive folder.
  - CSV ledger export directly to Google Sheets.
- 🛡️ **Automated SQL Migrations**: SQL schema migrations bundled from `migrations/` and run automatically on app launch.
- 🗑️ **In-App Safety Modals**: Custom confirmation dialogs replacing native browser alerts for destructive deletion actions.

---

## Tech Stack

| Component | Technology | Purpose |
| --- | --- | --- |
| **Desktop Framework** | [Tauri v2](https://tauri.app) | Rust desktop runtime container |
| **Frontend UI** | React 19 + TypeScript + Vite | User interface & reactive state |
| **Styling & Components** | Tailwind CSS v4 + Radix UI / shadcn/ui | Component design system |
| **State Management** | Zustand | Global application state |
| **Database** | SQLite via `@tauri-apps/plugin-sql` | On-device relational database & native SQL queries |
| **PDF Renderer** | [Typst CLI](https://typst.app) | Fast markup document compilation (PDF & SVG) |

---

## Prerequisites & Local Setup

### 1. Prerequisites
- **Node.js**: v20+ and `npm`
- **Rust**: `rustc` & `cargo` installed via [rustup.rs](https://rustup.rs)
- **Typst CLI**: `typst` binary installed (`brew install typst` or `cargo install typst-cli`)

### 2. Environment Configuration
Create a `.env` file in the root directory (copy from `.env.example`):

```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### 3. Installation & Local Development

```bash
# Clone the repository
git clone https://github.com/vlevshits/invoice-generator.git
cd invoice-generator

# Install frontend dependencies
npm install

# Verify Rust compilation
cargo check --manifest-path src-tauri/Cargo.toml

# Run application in Tauri development mode
npm run tauri:dev
```

---

## Database & Migrations

Database tables are defined in [`migrations/0001_initial_schema.sql`](file:///Users/levshitsvv/Projects/Sandbox/invoice-generator/migrations/0001_initial_schema.sql).

Migrations in `migrations/` are bundled at build time using Vite `import.meta.glob` and executed automatically when the database initializes (`src/lib/migrator.ts`).

---

## Google OAuth2 PKCE Setup

To enable Google Drive backup and Google Sheets export:
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create an **OAuth 2.0 Client ID** with type set to **Desktop App**.
3. Enable the **Google Drive API** and **Google Sheets API**.
4. Add your Client ID and Client Secret to `.env` or in **Settings & Bank Accounts** inside the app.
5. Authorize using local loopback callback (`http://127.0.0.1:9876/callback`).

---

## Building & Packaging Executables

To compile release desktop packages (`.dmg` for macOS, `.msi` / `.exe` for Windows, `.deb` / `.AppImage` for Linux):

```bash
npm run tauri:build
```

Build outputs are saved to `src-tauri/target/release/bundle/`.

CI/CD automation is configured in `.github/workflows/release.yml` using `tauri-apps/tauri-action@v0` to build and upload release artifacts when version tags (`v*`) are pushed.

---

## License

Distributed under the MIT License.
