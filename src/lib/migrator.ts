import type Database from '@tauri-apps/plugin-sql'

// Vite eager glob to bundle all Drizzle .sql migration files into client build
const migrationFiles = import.meta.glob('/drizzle/*.sql', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>

export async function ensureDbSchemaColumns(rawDb: Database): Promise<void> {
  const alterStatements = [
    'ALTER TABLE profiles ADD COLUMN email TEXT;',
    'ALTER TABLE profiles ADD COLUMN default_payment_terms TEXT;',
    'ALTER TABLE profiles ADD COLUMN custom_typst_template TEXT;',
    'ALTER TABLE counterparties ADD COLUMN email TEXT;',
    'ALTER TABLE invoices ADD COLUMN paid_date TEXT;',
  ]

  for (const sql of alterStatements) {
    try {
      await rawDb.execute(sql)
    } catch {
      // Column already exists, ignore
    }
  }
}

export async function runDrizzleMigrations(rawDb: Database): Promise<void> {
  try {
    // 0. Guarantee all schema columns exist
    await ensureDbSchemaColumns(rawDb)

    // 1. Ensure Drizzle migration tracking table exists
    await rawDb.execute(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );
    `)

    // 2. Fetch already executed migration hashes
    const appliedRows = await rawDb.select<{ hash: string }[]>(
      'SELECT hash FROM __drizzle_migrations ORDER BY id ASC'
    )
    const appliedHashes = new Set(appliedRows.map((r) => r.hash))

    // 3. Sort migration files sequentially (0000_..., 0001_...)
    const sortedKeys = Object.keys(migrationFiles).sort()

    for (const fileKey of sortedKeys) {
      const fileName = fileKey.split('/').pop() || fileKey
      if (!appliedHashes.has(fileName)) {
        const sqlContent = migrationFiles[fileKey]
        if (sqlContent) {
          // Drizzle breaks statements using '--> statement-breakpoint' comments
          const statements = sqlContent
            .split('--> statement-breakpoint')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)

          for (const stmt of statements) {
            const safeStmt = stmt
              .replace(/^CREATE TABLE\s+`/i, 'CREATE TABLE IF NOT EXISTS `')
              .replace(/^CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ')
              .replace(/^CREATE UNIQUE INDEX\s+`/i, 'CREATE UNIQUE INDEX IF NOT EXISTS `')
              .replace(/^CREATE UNIQUE INDEX\s+/i, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
              .replace(/^CREATE INDEX\s+`/i, 'CREATE INDEX IF NOT EXISTS `')
              .replace(/^CREATE INDEX\s+/i, 'CREATE INDEX IF NOT EXISTS ')

            try {
              await rawDb.execute(safeStmt)
            } catch (err: any) {
              const msg = String(err?.message || err).toLowerCase()
              if (
                msg.includes('already exists') ||
                msg.includes('duplicate column name')
              ) {
                continue
              }
              console.error(`[Drizzle Migration Error] Failed statement: ${stmt}`, err)
              throw err
            }
          }

          await rawDb.execute(
            'INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)',
            [fileName, Date.now()]
          )
          console.log(`[Drizzle Migration] Successfully applied: ${fileName}`)
        }
      }
    }
  } catch (err) {
    console.error('Failed to run Drizzle migrations:', err)
  }
}
