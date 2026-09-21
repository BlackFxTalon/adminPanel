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

describe('Contragents HTTP boundary', () => {
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

  it('requires authentication and returns Organization-scoped lookup', async () => {
    const unauthorized = await request(app.getHttpServer()).get('/api/v1/contragents/lookup').expect(401)
    expect(unauthorized.body).toMatchObject({ code: expect.any(String), requestId: expect.any(String) })

    const accessToken = await login(app)
    const response = await request(app.getHttpServer())
      .get('/api/v1/contragents/lookup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(response.body).toEqual([
      { id: 'contragent-local-contact', label: 'Анна Соколова', kind: 'contact', companyName: 'Уралредуктор' },
      { id: 'contragent-local-factory', label: 'Уралмашзавод', kind: 'company' },
      { id: 'contragent-local-reducer', label: 'Уралредуктор', kind: 'company' },
    ])
    expect(JSON.stringify(response.body)).not.toContain('foreign')

    const companies = await request(app.getHttpServer())
      .get('/api/v1/contragents/lookup?kind=company')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(companies.body.map((item: { label: string }) => item.label)).toEqual(['Уралмашзавод', 'Уралредуктор'])
  })

  it('returns the Organization-scoped directory with Company/Contact distinction, search and invalid-query errors', async () => {
    const accessToken = await login(app)

    const response = await request(app.getHttpServer())
      .get('/api/v1/contragents?page=1&pageSize=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(response.body.total).toBe(3)
    expect(response.body.items.map((item: { displayName: string, kind: string, companyName?: string }) => [
      item.displayName, item.kind, item.companyName ?? null,
    ])).toEqual([
      ['Анна Соколова', 'contact', 'Уралредуктор'],
      ['Уралмашзавод', 'company', null],
      ['Уралредуктор', 'company', null],
    ])

    const searched = await request(app.getHttpServer())
      .get(`/api/v1/contragents?page=1&pageSize=10&search=${encodeURIComponent('анна')}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(searched.body.items.map((item: { displayName: string }) => item.displayName))
      .toEqual(['Анна Соколова'])

    const invalid = await request(app.getHttpServer())
      .get('/api/v1/contragents?page=0&pageSize=101')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
    expect(invalid.body).toMatchObject({
      code: 'INVALID_CONTRAGENTS_QUERY',
      requestId: expect.any(String),
    })
  })
})
