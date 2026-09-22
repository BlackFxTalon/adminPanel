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

async function login(app: INestApplication, email: string, password: string): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(201)
  return String(response.body.accessToken)
}

describe('Users HTTP boundary', () => {
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

  it('requires authentication and returns only the current Organization Users with roles', async () => {
    const unauthorized = await request(app.getHttpServer()).get('/api/v1/users').expect(401)
    expect(unauthorized.body).toMatchObject({ code: expect.any(String), requestId: expect.any(String) })

    // The seed really contains a foreign-Org User, so the leak assertion below is meaningful.
    const foreignUsers = await sql.query("SELECT count(*)::int AS count FROM users WHERE organization_id = 'org_foreign'")
    expect(foreignUsers.rows[0]?.count).toBe(1)

    const accessToken = await login(app, authTestEnvironment.AUTH_TEST_ADMIN_EMAIL, authTestEnvironment.AUTH_TEST_ADMIN_PASSWORD)
    const response = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&pageSize=10&sortBy=name&sortDirection=asc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(response.body.total).toBe(2)
    expect(response.body.items).toEqual([
      {
        id: 'user_admin_local',
        email: 'admin@local.invalid',
        name: 'Local Admin',
        role: 'admin',
        organization: { id: 'org_local', name: 'Local Organization' },
      },
      {
        id: 'user_local',
        email: 'user@local.invalid',
        name: 'Local User',
        role: 'user',
        organization: { id: 'org_local', name: 'Local Organization' },
      },
    ])
    expect(JSON.stringify(response.body)).not.toContain('foreign')
  })

  it('searches, filters by role and rejects invalid queries', async () => {
    const accessToken = await login(app, authTestEnvironment.AUTH_TEST_ADMIN_EMAIL, authTestEnvironment.AUTH_TEST_ADMIN_PASSWORD)

    const searched = await request(app.getHttpServer())
      .get(`/api/v1/users?page=1&pageSize=10&sortBy=name&sortDirection=asc&search=${encodeURIComponent('local user')}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(searched.body.items.map((user: { name: string }) => user.name)).toEqual(['Local User'])

    const admins = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&pageSize=10&sortBy=name&sortDirection=asc&role=admin')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(admins.body.items.map((user: { role: string }) => user.role)).toEqual(['admin'])

    const invalid = await request(app.getHttpServer())
      .get('/api/v1/users?page=0&pageSize=10&sortBy=name&sortDirection=asc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
    expect(invalid.body).toMatchObject({ code: 'INVALID_USERS_QUERY', requestId: expect.any(String) })

    const invalidRole = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&pageSize=10&sortBy=name&sortDirection=asc&role=owner')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
    expect(invalidRole.body).toMatchObject({ code: 'INVALID_USERS_QUERY' })
  })

  it('gives a non-admin User the same read-only Organization scope', async () => {
    const userToken = await login(app, authTestEnvironment.AUTH_TEST_USER_EMAIL, authTestEnvironment.AUTH_TEST_USER_PASSWORD)
    const response = await request(app.getHttpServer())
      .get('/api/v1/users?page=1&pageSize=10&sortBy=name&sortDirection=asc')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
    expect(response.body.total).toBe(2)
    expect(response.body.items.every((user: { role: string }) => ['admin', 'user'].includes(user.role))).toBe(true)
  })
})
