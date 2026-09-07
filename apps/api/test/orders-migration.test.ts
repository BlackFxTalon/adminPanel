import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { readFile } from 'node:fs/promises'
import { Client } from 'pg'
import { describe, expect, it } from 'vitest'

import { createPrismaClient } from '../src/database/prisma-client'
import { seedOrdersDatabase } from '../prisma/seed'

const migrationUrl = new URL('../prisma/migrations/202609020001_orders_foundation/migration.sql', import.meta.url)

async function withMigratedDatabase(run: (client: Client, databaseUrl: string) => Promise<void>): Promise<void> {
  const migration = await readFile(migrationUrl, 'utf8')
  const container = await new PostgreSqlContainer('postgres:17-alpine').start()
  const client = new Client({ connectionString: container.getConnectionUri() })
  try {
    await client.connect()
    await client.query(migration)
    await run(client, container.getConnectionUri())
  } finally {
    await client.end().catch(() => undefined)
    await container.stop()
  }
}

describe('Orders foundation migration', () => {
  it('creates the promised relational model and enforces tenant and value invariants', async () => {
    await withMigratedDatabase(async (client) => {
      const tables = await client.query<{ tablename: string }>(
        "select tablename from pg_tables where schemaname = 'public' order by tablename",
      )
      expect(tables.rows.map(row => row.tablename)).toEqual([
        'auth_sessions',
        'companies',
        'contacts',
        'contragents',
        'offers',
        'order_items',
        'orders',
        'organizations',
        'users',
      ])

      await client.query("insert into organizations (id, name) values ('org-a', 'A'), ('org-b', 'B')")
      await client.query("insert into users (id, organization_id, email, name, role) values ('user-a', 'org-a', 'a@example.invalid', 'A', 'admin')")
      await client.query("insert into contragents (id, organization_id, kind, display_name) values ('party-b', 'org-b', 'company', 'Foreign')")

      await expect(client.query(`
        insert into orders (
          id, organization_id, number, contragent_id, responsible_user_id,
          status, currency, total_minor, created_at
        ) values (
          'order-cross', 'org-a', 'ORD-CROSS', 'party-b', 'user-a',
          'pending_approval', 'RUB', 0, now()
        )
      `)).rejects.toThrow()

      await client.query("insert into contragents (id, organization_id, kind, display_name) values ('party-a', 'org-a', 'company', 'Local')")
      await client.query(`
        insert into orders (
          id, organization_id, number, contragent_id, responsible_user_id,
          status, currency, total_minor, created_at
        ) values (
          'order-a', 'org-a', 'ORD-A', 'party-a', 'user-a',
          'pending_approval', 'RUB', 100, now()
        )
      `)
      await expect(client.query(`
        insert into order_items (
          id, order_id, organization_id, position, name, quantity,
          unit_price_minor, amount_minor
        ) values ('item-invalid', 'order-a', 'org-a', 1, 'Invalid', 0, 100, 0)
      `)).rejects.toThrow()
      await client.query(`
        insert into order_items (
          id, order_id, organization_id, position, name, quantity,
          unit_price_minor, amount_minor
        ) values ('item-a', 'order-a', 'org-a', 1, 'Valid', 1, 100, 100)
      `)

      const itemCount = await client.query<{ count: string }>('select count(*) from order_items')
      expect(itemCount.rows[0]?.count).toBe('1')
    })
  }, 120_000)

  it('loads the deterministic first-slice seed idempotently', async () => {
    await withMigratedDatabase(async (_client, databaseUrl) => {
      const prisma = createPrismaClient(databaseUrl)
      try {
        await seedOrdersDatabase(prisma)
        await seedOrdersDatabase(prisma)
        await expect(prisma.organization.count()).resolves.toBe(2)
        await expect(prisma.user.count()).resolves.toBe(3)
        await expect(prisma.contragent.count()).resolves.toBe(4)
        await expect(prisma.offer.count()).resolves.toBe(2)
        await expect(prisma.order.count()).resolves.toBe(3)
        await expect(prisma.orderItem.count()).resolves.toBe(4)
        await expect(prisma.order.findUnique({ where: { id: 'order-local-1' } })).resolves.toMatchObject({
          organizationId: 'org_local',
          number: 'ORD-2026-001',
          totalMinor: 1250000n,
        })
      } finally {
        await prisma.$disconnect()
      }
    })
  }, 120_000)
})
