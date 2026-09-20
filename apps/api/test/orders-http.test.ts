import type { OrderStatus } from '@admin-panel/contracts'
import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { readFile } from 'node:fs/promises'
import { Client } from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { seedOrdersDatabase } from '../prisma/seed'
import { AppModule } from '../src/app.module'
import { createPrismaClient } from '../src/database/prisma-client'
import { readAuthTestEnvironment } from './auth-test-environment'

const migrationUrl = new URL('../prisma/migrations/202609020001_orders_foundation/migration.sql', import.meta.url)
const authTestEnvironment = readAuthTestEnvironment()

async function login(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({
      email: authTestEnvironment.AUTH_TEST_ADMIN_EMAIL,
      password: authTestEnvironment.AUTH_TEST_ADMIN_PASSWORD,
    })
    .expect(201)
  return String(response.body.accessToken)
}

describe('Orders HTTP boundary', () => {
  let app: INestApplication
  let container: StartedPostgreSqlContainer
  let sql: Client
  let previousDatabaseUrl: string | undefined

  beforeAll(async () => {
    Object.assign(process.env, authTestEnvironment)
    previousDatabaseUrl = process.env.DATABASE_URL
    container = await new PostgreSqlContainer('postgres:17-alpine').start()
    process.env.DATABASE_URL = container.getConnectionUri()
    sql = new Client({ connectionString: process.env.DATABASE_URL })
    await sql.connect()
    await sql.query(await readFile(migrationUrl, 'utf8'))
    const prisma = createPrismaClient(process.env.DATABASE_URL)
    try {
      await seedOrdersDatabase(prisma)
    } finally {
      await prisma.$disconnect()
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  }, 120_000)

  afterAll(async () => {
    await app?.close()
    await sql?.end()
    await container?.stop()
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDatabaseUrl
  })

  it('requires authentication and lists only Orders from the current Organization', async () => {
    const unauthorized = await request(app.getHttpServer()).get('/api/v1/orders').expect(401)
    expect(unauthorized.body).toMatchObject({
      code: 'ACCESS_TOKEN_EXPIRED',
      requestId: expect.any(String),
    })
    const accessToken = await login(app)
    const response = await request(app.getHttpServer())
      .get('/api/v1/orders?page=1&pageSize=10&sortBy=createdAt&sortDirection=desc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 2,
      items: [
        { id: 'order-local-2', organization: { id: 'org_local' } },
        { id: 'order-local-1', organization: { id: 'org_local' } },
      ],
    })
    expect(JSON.stringify(response.body)).not.toContain('org_foreign')
    expect(response.body.filterOptions.contragents).toHaveLength(3)
  })

  it('applies search, status, Contragent, pagination and sort and reports invalid queries structurally', async () => {
    const accessToken = await login(app)
    const filtered = await request(app.getHttpServer())
      .get('/api/v1/orders?page=1&pageSize=1&search=%D1%80%D0%B5%D0%B4%D1%83%D0%BA%D1%82%D0%BE%D1%80&status=in_work&contragentId=contragent-local-reducer&sortBy=number&sortDirection=asc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(filtered.body).toMatchObject({
      page: 1,
      pageSize: 1,
      total: 1,
      items: [{ id: 'order-local-2', number: 'ORD-2026-002' }],
    })

    const invalid = await request(app.getHttpServer())
      .get('/api/v1/orders?page=0&pageSize=101&sortBy=unknown&sortDirection=sideways')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
    expect(invalid.body).toMatchObject({
      code: 'INVALID_ORDERS_QUERY',
      requestId: expect.any(String),
    })
  })

  it('returns local detail and hides a foreign Organization Order as not found', async () => {
    const accessToken = await login(app)
    const local = await request(app.getHttpServer())
      .get('/api/v1/orders/order-local-2')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(local.body).toMatchObject({
      id: 'order-local-2',
      organization: { id: 'org_local' },
      items: [
        { name: 'Промышленный редуктор', amountMinor: 29000000 },
        { name: 'Муфта', amountMinor: 1000000 },
      ],
      totalMinor: 30000000,
    })

    const foreign = await request(app.getHttpServer())
      .get('/api/v1/orders/order-foreign-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404)
    expect(foreign.body).toMatchObject({
      code: 'ORDER_NOT_FOUND',
      requestId: expect.any(String),
    })
  })

  it('returns only local Contragent and Offer creation options', async () => {
    const accessToken = await login(app)
    const response = await request(app.getHttpServer())
      .get('/api/v1/orders/creation-options')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(response.body.contragents).toEqual([
      { id: 'contragent-local-contact', label: 'Анна Соколова' },
      { id: 'contragent-local-factory', label: 'Уралмашзавод' },
      { id: 'contragent-local-reducer', label: 'Уралредуктор' },
    ])
    expect(response.body.offers).toEqual([
      { id: 'offer-local-2', label: 'Предложение на логистику' },
      { id: 'offer-local-1', label: 'Предложение на редукторы' },
    ])
    expect(JSON.stringify(response.body)).not.toContain('foreign')
  })

  it('validates create input and rejects cross-Organization references', async () => {
    const accessToken = await login(app)
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contragentId: 'contragent-foreign-company',
        offerId: 'offer-foreign-1',
        items: [{ clientId: 'duplicate', name: ' ', quantity: 0, unitPriceMinor: -1 }, { clientId: 'duplicate', name: 'Муфта', quantity: 1.5, unitPriceMinor: 100 }],
      })
      .expect(400)

    expect(response.body).toMatchObject({
      code: 'ORDER_VALIDATION_FAILED',
      message: 'Исправьте ошибки в форме.',
      requestId: expect.any(String),
      fieldErrors: {
        contragentId: expect.any(Array),
        offerId: expect.any(Array),
        'items.0.name': expect.any(Array),
        'items.0.quantity': expect.any(Array),
        'items.0.unitPriceMinor': expect.any(Array),
        'items.1.clientId': expect.any(Array),
        'items.1.quantity': expect.any(Array),
      },
    })
    expect(await sql.query("SELECT count(*)::int AS count FROM orders WHERE organization_id = 'org_local'"))
      .toMatchObject({ rows: [{ count: 2 }] })
  })

  it('creates an atomic Order with authoritative server-calculated RUB totals', async () => {
    const accessToken = await login(app)
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contragentId: 'contragent-local-reducer',
        offerId: 'offer-local-1',
        totalMinor: 1,
        items: [
          { clientId: 'first', name: ' Редуктор ', quantity: 2, unitPriceMinor: 150000, amountMinor: 1 },
          { clientId: 'second', name: 'Муфта', quantity: 3, unitPriceMinor: 25000, characteristics: ' усиленная ' },
        ],
      })
      .expect(201)

    expect(response.body).toMatchObject({
      contragent: { id: 'contragent-local-reducer' },
      offer: { id: 'offer-local-1' },
      status: 'pending_approval',
      currency: 'RUB',
      totalMinor: 375000,
      responsibleUser: { id: 'user_admin_local' },
      organization: { id: 'org_local' },
      items: [
        { name: 'Редуктор', quantity: 2, unitPriceMinor: 150000, amountMinor: 300000 },
        { name: 'Муфта', quantity: 3, unitPriceMinor: 25000, amountMinor: 75000, characteristics: 'усиленная' },
      ],
    })
    expect(response.body.number).toMatch(/^ORD-\d{4}-[0-9A-F]{8}$/)

    const stored = await sql.query(
      'SELECT total_minor::int AS total FROM orders WHERE id = $1',
      [response.body.id],
    )
    expect(stored.rows).toEqual([{ total: 375000 }])

    const refreshed = await request(app.getHttpServer())
      .get(`/api/v1/orders?page=1&pageSize=10&search=${encodeURIComponent(response.body.number)}&sortBy=createdAt&sortDirection=desc`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(refreshed.body).toMatchObject({ total: 1, items: [{ id: response.body.id, totalMinor: 375000 }] })
  })

  it('rolls back the parent Order when an item persistence step fails', async () => {
    const accessToken = await login(app)
    const before = await sql.query("SELECT count(*)::int AS count FROM orders WHERE organization_id = 'org_local'")
    await sql.query(`
      CREATE FUNCTION reject_rollback_test_item() RETURNS trigger AS $$
      BEGIN
        IF NEW.name = 'ROLLBACK_TEST' THEN RAISE EXCEPTION 'forced item failure'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_rollback_test_item
      BEFORE INSERT ON order_items
      FOR EACH ROW EXECUTE FUNCTION reject_rollback_test_item();
    `)
    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contragentId: 'contragent-local-factory',
          items: [{ clientId: 'rollback', name: 'ROLLBACK_TEST', quantity: 1, unitPriceMinor: 100 }],
        })
        .expect(500)
      expect(response.body).toMatchObject({
        code: 'ORDER_PERSISTENCE_FAILED',
        requestId: expect.any(String),
      })
    } finally {
      await sql.query('DROP TRIGGER reject_rollback_test_item ON order_items; DROP FUNCTION reject_rollback_test_item();')
    }
    const after = await sql.query("SELECT count(*)::int AS count FROM orders WHERE organization_id = 'org_local'")
    expect(after.rows).toEqual(before.rows)
  })

  it('enforces every status edge and rejects invalid, missing, cross-Organization and unauthorized transitions', async () => {
    const accessToken = await login(app)
    const validEdges: readonly [OrderStatus, OrderStatus][] = [
      ['pending_approval', 'in_work'],
      ['pending_approval', 'cancelled'],
      ['in_work', 'cargo_in_transit'],
      ['in_work', 'awaiting_payment'],
      ['in_work', 'cancelled'],
      ['cargo_in_transit', 'awaiting_payment'],
      ['awaiting_payment', 'completed'],
    ]

    for (const [index, [currentStatus, nextStatus]] of validEdges.entries()) {
      const id = `order-transition-${index}`
      await sql.query(`
        INSERT INTO orders (
          id, organization_id, number, contragent_id, responsible_user_id,
          status, currency, total_minor, created_at
        ) VALUES ($1, 'org_local', $2, 'contragent-local-factory', 'user_admin_local', $3, 'RUB', 100, now())
      `, [id, `ORD-TRANSITION-${index}`, currentStatus])
      await sql.query(`
        INSERT INTO order_items (
          id, order_id, organization_id, position, name, quantity, unit_price_minor, amount_minor
        ) VALUES ($1, $2, 'org_local', 1, 'Тестовая позиция', 1, 100, 100)
      `, [`${id}-item`, id])

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: nextStatus })
        .expect(200)
      expect(response.body).toMatchObject({ id, status: nextStatus })
      expect(await sql.query('SELECT status FROM orders WHERE id = $1', [id]))
        .toMatchObject({ rows: [{ status: nextStatus }] })
    }

    const invalid = await request(app.getHttpServer())
      .patch('/api/v1/orders/order-local-1/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'completed' })
      .expect(409)
    expect(invalid.body).toMatchObject({
      code: 'INVALID_ORDER_STATUS_TRANSITION',
      requestId: expect.any(String),
    })

    const missing = await request(app.getHttpServer())
      .patch('/api/v1/orders/order-local-1/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400)
    expect(missing.body).toMatchObject({
      code: 'ORDER_STATUS_VALIDATION_FAILED',
      requestId: expect.any(String),
      fieldErrors: { status: expect.any(Array) },
    })

    const unknown = await request(app.getHttpServer())
      .patch('/api/v1/orders/order-local-1/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'unknown' })
      .expect(400)
    expect(unknown.body).toMatchObject({
      code: 'ORDER_STATUS_VALIDATION_FAILED',
      requestId: expect.any(String),
      fieldErrors: { status: expect.any(Array) },
    })

    const foreign = await request(app.getHttpServer())
      .patch('/api/v1/orders/order-foreign-1/status')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'in_work' })
      .expect(404)
    expect(foreign.body).toMatchObject({ code: 'ORDER_NOT_FOUND', requestId: expect.any(String) })

    const unauthorized = await request(app.getHttpServer())
      .patch('/api/v1/orders/order-local-1/status')
      .send({ status: 'in_work' })
      .expect(401)
    expect(unauthorized.body).toMatchObject({ code: 'ACCESS_TOKEN_EXPIRED', requestId: expect.any(String) })

    for (const id of ['order-transition-1', 'order-transition-4', 'order-transition-6']) {
      const finalAttempt = await request(app.getHttpServer())
        .patch(`/api/v1/orders/${id}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'in_work' })
        .expect(409)
      expect(finalAttempt.body).toMatchObject({ code: 'INVALID_ORDER_STATUS_TRANSITION' })
    }
  })
})
