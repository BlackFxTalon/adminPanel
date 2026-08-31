import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { createLocalAuthSeed } from '../src/auth/auth.seed'
import { readAuthTestEnvironment } from './auth-test-environment'

const authTestEnvironment = readAuthTestEnvironment()
const adminCredentials = {
  email: authTestEnvironment.AUTH_TEST_ADMIN_EMAIL,
  password: authTestEnvironment.AUTH_TEST_ADMIN_PASSWORD,
}

describe('authentication HTTP boundary', () => {
  let app: INestApplication

  beforeEach(async () => {
    Object.assign(process.env, authTestEnvironment)

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('establishes a secure session and returns the server-owned Organization', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ ...adminCredentials, organizationId: 'org_foreign' })
      .expect(201)

    expect(login.body).toMatchObject({
      accessToken: expect.any(String),
      user: {
        email: adminCredentials.email,
        role: 'admin',
        organization: { id: 'org_local', name: 'Local Organization' },
      },
    })
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly')
    expect(login.headers['set-cookie'][0]).toContain('Secure')
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Strict')
    expect(login.headers['set-cookie'][0]).toContain('Path=/')

    const [, payload] = String(login.body.accessToken).split('.')
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp: number, iat: number }
    expect(claims.exp - claims.iat).toBe(300)

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${String(login.body.accessToken)}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.organization.id).toBe('org_local')
      })

    const userLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: authTestEnvironment.AUTH_TEST_USER_EMAIL,
        password: authTestEnvironment.AUTH_TEST_USER_PASSWORD,
        organizationId: 'org_foreign',
      })
      .expect(201)

    expect(userLogin.body.user).toMatchObject({
      role: 'user',
      organization: { id: 'org_local' },
    })
    expect(userLogin.body.user.id).not.toBe(login.body.user.id)
  })

  it('returns the same stable error for unknown email and wrong password', async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ ...adminCredentials, password: 'wrong-password' })
      .expect(401)
    const unknownEmail = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ ...adminCredentials, email: 'missing@example.test' })
      .expect(401)

    expect(wrongPassword.body).toEqual(unknownEmail.body)
    expect(wrongPassword.body).toMatchObject({ code: 'INVALID_CREDENTIALS' })

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({})
      .expect(401)
  })

  it('fails fast when either required seeded User is not configured', () => {
    const password = process.env.AUTH_TEST_USER_PASSWORD
    delete process.env.AUTH_TEST_USER_PASSWORD

    try {
      expect(() => createLocalAuthSeed()).toThrow('AUTH_TEST_USER_PASSWORD is required')
    } finally {
      process.env.AUTH_TEST_USER_PASSWORD = password
    }
  })

  it('rotates refresh tokens, invalidates a replayed session family and revokes logout', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(201)
    const refreshCookie = String(login.headers['set-cookie'][0]).split(';')[0]

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(201)
    const rotatedCookie = String(refreshed.headers['set-cookie'][0]).split(';')[0]

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401)

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${String(refreshed.body.accessToken)}`)
      .expect(401)

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedCookie)
      .expect(401)

    const secondLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send(adminCredentials)
      .expect(201)
    const logoutCookie = String(secondLogin.headers['set-cookie'][0]).split(';')[0]

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', logoutCookie)
      .expect(204)

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', logoutCookie)
      .expect(401)
  })
})