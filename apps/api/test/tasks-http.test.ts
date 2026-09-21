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

describe('Tasks HTTP boundary', () => {
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

  it('requires authentication and returns Organization-scoped Tasks', async () => {
    const unauthorized = await request(app.getHttpServer()).get('/api/v1/tasks').expect(401)
    expect(unauthorized.body).toMatchObject({ code: expect.any(String), requestId: expect.any(String) })

    // The seed really contains a foreign-Org Task, so the leak assertion below is meaningful.
    const foreignTasks = await sql.query("SELECT count(*)::int AS count FROM tasks WHERE organization_id = 'org_foreign'")
    expect(foreignTasks.rows[0]?.count).toBe(1)

    const accessToken = await login(app)
    const response = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=1&pageSize=10&sortBy=createdAt&sortDirection=desc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(response.body.total).toBe(2)
    expect(response.body.items.map((task: { id: string }) => task.id)).toEqual(['task-local-2', 'task-local-1'])
    expect(response.body.items[0]).toMatchObject({
      number: 'TASK-2026-002',
      title: 'Подготовить коммерческое предложение',
      status: 'in_progress',
      priority: 'medium',
      assignee: { id: 'user_local', name: 'Local User' },
      organization: { id: 'org_local', name: 'Local Organization' },
    })
    expect(response.body.items[1]).toMatchObject({
      number: 'TASK-2026-001',
      title: 'Позвонить контрагенту',
      status: 'open',
      priority: 'high',
      assignee: { id: 'user_admin_local', name: 'Local Admin' },
      contragent: { id: 'contragent-local-factory', label: 'Уралмашзавод' },
      order: { id: 'order-local-1', label: 'ORD-2026-001' },
    })
    expect(JSON.stringify(response.body)).not.toContain('foreign')
  })

  it('exposes creation options from the same Organization identity space', async () => {
    const accessToken = await login(app)
    const response = await request(app.getHttpServer())
      .get('/api/v1/tasks/creation-options')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(response.body.assignees).toEqual([
      { id: 'user_admin_local', name: 'Local Admin' },
      { id: 'user_local', name: 'Local User' },
    ])
    expect(response.body.contragents).toContainEqual({ id: 'contragent-local-factory', label: 'Уралмашзавод' })
    expect(response.body.orders).toContainEqual({ id: 'order-local-1', label: 'ORD-2026-001' })
    expect(JSON.stringify(response.body)).not.toContain('foreign')
  })

  it('searches, filters by status/assignee/mine and rejects invalid queries', async () => {
    const accessToken = await login(app)

    const searched = await request(app.getHttpServer())
      .get(`/api/v1/tasks?page=1&pageSize=10&sortBy=title&sortDirection=asc&search=${encodeURIComponent('позвонить')}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(searched.body.items.map((task: { number: string }) => task.number)).toEqual(['TASK-2026-001'])

    const byStatus = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=1&pageSize=10&sortBy=title&sortDirection=asc&status=in_progress')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(byStatus.body.items.map((task: { number: string }) => task.number)).toEqual(['TASK-2026-002'])

    const byAssignee = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=1&pageSize=10&sortBy=title&sortDirection=asc&assigneeId=user_local')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(byAssignee.body.items.map((task: { number: string }) => task.number)).toEqual(['TASK-2026-002'])

    const mine = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=1&pageSize=10&sortBy=title&sortDirection=asc&mine=true')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(mine.body.items.map((task: { number: string }) => task.number)).toEqual(['TASK-2026-001'])

    const invalid = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=0&pageSize=10&sortBy=title&sortDirection=asc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
    expect(invalid.body).toMatchObject({ code: 'INVALID_TASKS_QUERY', requestId: expect.any(String) })

    const invalidStatus = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=1&pageSize=10&sortBy=title&sortDirection=asc&status=archived')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
    expect(invalidStatus.body).toMatchObject({ code: 'INVALID_TASKS_QUERY' })
  })

  it('creates Tasks with optional links, defaults the assignee and rejects invalid input atomically', async () => {
    const accessToken = await login(app)

    const withLinks = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '  Согласовать спецификацию  ',
        description: 'Проверить позиции перед отгрузкой.',
        priority: 'high',
        assigneeId: 'user_local',
        contragentId: 'contragent-local-reducer',
        orderId: 'order-local-2',
      })
      .expect(201)
    expect(withLinks.body).toMatchObject({
      number: 'TASK-2026-003',
      title: 'Согласовать спецификацию',
      status: 'open',
      priority: 'high',
      assignee: { id: 'user_local', name: 'Local User' },
      contragent: { id: 'contragent-local-reducer', label: 'Уралредуктор' },
      order: { id: 'order-local-2', label: 'ORD-2026-002' },
      organization: { id: 'org_local' },
    })

    const minimal = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Минимальная задача' })
      .expect(201)
    expect(minimal.body).toMatchObject({
      number: 'TASK-2026-004',
      priority: 'medium',
      status: 'open',
      assignee: { id: 'user_admin_local', name: 'Local Admin' },
    })
    expect(minimal.body.contragent).toBeUndefined()
    expect(minimal.body.order).toBeUndefined()

    const invalid = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: ' ',
        priority: 'urgent',
        assigneeId: 'user_foreign',
        contragentId: 'contragent-foreign-company',
        orderId: 'order-foreign-1',
      })
      .expect(400)
    expect(invalid.body).toMatchObject({
      code: 'TASK_VALIDATION_FAILED',
      message: 'Исправьте ошибки в форме.',
      requestId: expect.any(String),
      fieldErrors: {
        title: expect.any(Array),
        priority: expect.any(Array),
        assigneeId: expect.any(Array),
        contragentId: expect.any(Array),
        orderId: expect.any(Array),
      },
    })

    const list = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=1&pageSize=10&sortBy=createdAt&sortDirection=desc')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(list.body.total).toBe(4)
  })
})
