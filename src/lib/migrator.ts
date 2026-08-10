import { sql } from 'drizzle-orm'
import type { drizzle } from 'drizzle-orm/sqlite-proxy'
import type * as schema from '@/db/schema'

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

// Vite eager glob to bundle all Drizzle .sql migration files into client build
const migrationFiles = import.meta.glob('/drizzle/*.sql', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>

export async function runDrizzleMigrations(db: DrizzleDb): Promise<void> {
  try {
    // 1. Ensure Drizzle migration tracking table exists
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );
    `)

    // 2. Fetch already executed migration hashes
    const appliedRows = await db.values<[string]>(
      sql`SELECT hash FROM __drizzle_migrations ORDER BY id ASC`
    )
    const appliedHashes = new Set(appliedRows.map((r) => r[0]))

    // 3. Sort migration files sequentially (0000_..., 0001_...)
    const sortedKeys = Object.keys(migrationFiles).sort()

    for (const fileKey of sortedKeys) {
      const fileName = fileKey.split('/').pop() || fileKey
      const fileStem = fileName.replace(/\.sql$/, '')

      if (!appliedHashes.has(fileName) && !appliedHashes.has(fileStem)) {
        const sqlContent = migrationFiles[fileKey]
        if (sqlContent) {
          // Drizzle breaks statements using '--> statement-breakpoint' comments
          const statements = sqlContent
            .split('--> statement-breakpoint')
            .map((s) => s.trim())
            .filter((s) => s.length > 0)

          for (const stmt of statements) {
            try {
              await db.run(sql.raw(stmt))
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

          await db.run(
            sql`INSERT INTO __drizzle_migrations (hash, created_at) VALUES (${fileName}, ${Date.now()})`
          )
          console.log(`[Drizzle Migration] Successfully applied: ${fileName}`)
        }
      }
    }
  } catch (err) {
    console.error('Failed to run Drizzle migrations:', err)
  }
}
