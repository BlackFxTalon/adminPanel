import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Client } from 'pg'

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../prisma/migrations')

/**
 * Applies every migration SQL file in lexical order — the same order Prisma
 * Migrate uses — so test containers always match the current schema.
 */
export async function applyMigrations(sql: Client): Promise<void> {
  const entries = await readdir(migrationsDir, { withFileTypes: true })
  const directories = entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()
  for (const directory of directories) {
    const migration = await readFile(path.join(migrationsDir, directory, 'migration.sql'), 'utf8')
    await sql.query(migration)
  }
}
