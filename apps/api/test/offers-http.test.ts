import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { Client } from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { applyMigrations } from './apply-migrations'
import { seedOrdersDatabase } from '../prisma/seed'
import { AppModule } from '../src/app.module'
import { createPrismaClient } from '../src/database/prisma-client'
import { readAuthTestEnvironment } from './auth-test-environment'

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

describe('Offers HTTP boundary', () => {
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
    await applyMigrations(sql)
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

  it('requires authentication and returns Organization-scoped Offers', async () => {
    const unauthorized = await request(app.getHttpServer()).get('/api/v1/offers').expect(401)
    expect(unauthorized.body).toMatchObject({ code: expect.any(String), requestId: expect.any(String) })

    // The seed really contains a foreign-Org Offer, so the leak assertion below is meaningful.
    const foreignOffers = await sql.query("SELECT count(*)::int AS count FROM offers WHERE organization_id = 'org_foreign'")
    expect(foreignOffers.rows[0]?.count).toBe(1)

    const accessToken = await login(app)
    const response = await request(app.getHttpServer())
      .get('/api/v1/offers?page=1&pageSize=10&sortBy=number&sortDirection=asc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(response.body.total).toBe(2)
    expect(response.body.items).toEqual([
      {
        id: 'offer-local-1',
        createdAt: expect.any(String),
        number: 'OFF-2026-001',
        title: 'Предложение на редукторы',
        contragent: { id: 'contragent-local-reducer', label: 'Уралредуктор' },
        currency: 'RUB',
        ordersCount: 1,
        ordersTotalMinor: 30000000,
        organization: { id: 'org_local', name: 'Local Organization' },
      },
      {
        id: 'offer-local-2',
        createdAt: expect.any(String),
        number: 'OFF-2026-002',
        title: 'Предложение на логистику',
        currency: 'RUB',
        ordersCount: 0,
        ordersTotalMinor: 0,
        organization: { id: 'org_local', name: 'Local Organization' },
      },
    ])
    expect(JSON.stringify(response.body)).not.toContain('foreign')
    expect(response.body.filterOptions.contragents).toEqual([
      { id: 'contragent-local-reducer', label: 'Уралредуктор' },
    ])
  })

  it('computes associated Order totals from the same Organization scope', async () => {
    const accessToken = await login(app)

    const byTotal = await request(app.getHttpServer())
      .get('/api/v1/offers?page=1&pageSize=10&sortBy=ordersTotalMinor&sortDirection=desc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(byTotal.body.items[0]).toMatchObject({
      id: 'offer-local-1',
      ordersCount: 1,
      ordersTotalMinor: 30000000,
    })
  })

  it('searches by number, title and Contragent, filters by Contragent and rejects invalid queries', async () => {
    const accessToken = await login(app)

    const searched = await request(app.getHttpServer())
      .get(`/api/v1/offers?page=1&pageSize=10&sortBy=number&sortDirection=asc&search=${encodeURIComponent('логистику')}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(searched.body.items.map((offer: { number: string }) => offer.number)).toEqual(['OFF-2026-002'])

    const searchedByContragent = await request(app.getHttpServer())
      .get(`/api/v1/offers?page=1&pageSize=10&sortBy=number&sortDirection=asc&search=${encodeURIComponent('уралредуктор')}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(searchedByContragent.body.items.map((offer: { number: string }) => offer.number)).toEqual(['OFF-2026-001'])

    const filtered = await request(app.getHttpServer())
      .get('/api/v1/offers?page=1&pageSize=10&sortBy=number&sortDirection=asc&contragentId=contragent-local-reducer')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(filtered.body.items.map((offer: { number: string }) => offer.number)).toEqual(['OFF-2026-001'])

    const invalid = await request(app.getHttpServer())
      .get('/api/v1/offers?page=0&pageSize=10&sortBy=number&sortDirection=asc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
    expect(invalid.body).toMatchObject({
      code: 'INVALID_OFFERS_QUERY',
      requestId: expect.any(String),
    })

    const invalidSort = await request(app.getHttpServer())
      .get('/api/v1/offers?page=1&pageSize=10&sortBy=title&sortDirection=asc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
    expect(invalidSort.body).toMatchObject({ code: 'INVALID_OFFERS_QUERY' })
  })
})
