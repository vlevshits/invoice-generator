import type Database from '@tauri-apps/plugin-sql'

// Vite eager glob to bundle all standard .sql migration files into client build
const migrationFiles = import.meta.glob('/migrations/*.sql', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>

export async function runMigrations(db: Database): Promise<void> {
  try {
    // 1. Ensure schema migration tracking table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS __schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        executed_at INTEGER NOT NULL
      );
    `)

    // 2. Fetch already executed migration filenames
    const appliedRows = await db.select<{ filename: string }[]>(
      'SELECT filename FROM __schema_migrations ORDER BY id ASC'
    )
    const appliedHashes = new Set(appliedRows.map((r) => r.filename))

    // Check if legacy __drizzle_migrations table exists for backward compatibility
    try {
      const legacyRows = await db.select<{ hash: string }[]>(
        'SELECT hash FROM __drizzle_migrations'
      )
      for (const r of legacyRows) {
        appliedHashes.add(r.hash)
        appliedHashes.add(r.hash.replace(/\.sql$/, ''))
      }
    } catch {
      // Legacy table does not exist, ignore
    }

    // 3. Sort migration files sequentially (0001_..., 0002_...)
    const sortedKeys = Object.keys(migrationFiles).sort()

    for (const fileKey of sortedKeys) {
      const fileName = fileKey.split('/').pop() || fileKey
      const fileStem = fileName.replace(/\.sql$/, '')

      if (!appliedHashes.has(fileName) && !appliedHashes.has(fileStem)) {
        const sqlContent = migrationFiles[fileKey]
        if (sqlContent) {
          const statements = sqlContent
            .split('--> statement-breakpoint')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)

          for (const stmt of statements) {
            try {
              await db.execute(stmt)
            } catch (err: any) {
              const msg = String(err?.message || err).toLowerCase()
              if (
                msg.includes('already exists') ||
                msg.includes('duplicate column name')
              ) {
                continue
              }
              console.error(`[Migration Error] Failed statement: ${stmt}`, err)
              throw err
            }
          }

          await db.execute(
            'INSERT INTO __schema_migrations (filename, executed_at) VALUES ($1, $2)',
            [fileName, Date.now()]
          )
          console.log(`[Migration] Successfully applied: ${fileName}`)
        }
      }
    }
  } catch (err) {
    console.error('Failed to run database migrations:', err)
  }
}
