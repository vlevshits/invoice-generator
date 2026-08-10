import type Database from '@tauri-apps/plugin-sql'

// Vite eager glob to bundle all Drizzle .sql migration files into client build
const migrationFiles = import.meta.glob('/drizzle/*.sql', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>

export async function runDrizzleMigrations(rawDb: Database): Promise<void> {
  try {
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
            await rawDb.execute(stmt)
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
