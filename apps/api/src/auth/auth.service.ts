import type { AuthSessionResponse, AuthenticatedUser, LoginRequest } from '@admin-panel/contracts'
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { scrypt, scryptSync, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js'
import { createLocalAuthSeed, type SeededUser } from './auth.seed.js'
import { RefreshSessionStore } from './refresh-session.store.js'

const invalidCredentials = {
  code: 'INVALID_CREDENTIALS',
  message: 'Неверный email или пароль',
} as const

const derivePasswordHash = promisify(scrypt)

interface IssuedSession extends AuthSessionResponse {
  readonly refreshToken: string
}

function sessionExpired(): UnauthorizedException {
  return new UnauthorizedException({ code: 'SESSION_EXPIRED', message: 'Сессия истекла' })
}

function toPublicUser(user: SeededUser): AuthenticatedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organization: user.organization,
  }
}

@Injectable()
export class AuthService {
  private readonly users = createLocalAuthSeed()
  private readonly fakePasswordHash = scryptSync('invalid-password', 'invalid-user', 64)

  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(RefreshSessionStore) private readonly refreshSessions: RefreshSessionStore,
  ) {}

  async login(credentials: LoginRequest | null): Promise<IssuedSession> {
    const email = typeof credentials?.email === 'string' ? credentials.email.toLowerCase() : ''
    const password = typeof credentials?.password === 'string' ? credentials.password : ''
    const user = this.users.find(candidate => candidate.email === email)
    const actualHash = await derivePasswordHash(password, user?.id ?? 'invalid-user', 64) as Buffer
    const expectedHash = user?.passwordHash ?? this.fakePasswordHash
    if (!timingSafeEqual(actualHash, expectedHash) || !user) {
      throw new UnauthorizedException(invalidCredentials)
    }
    return this.issueSession(user)
  }

  async refresh(refreshToken: string | undefined): Promise<IssuedSession> {
    if (!refreshToken) throw sessionExpired()
    const session = this.refreshSessions.consume(refreshToken)
    if (!session) throw sessionExpired()
    const user = this.users.find(candidate => candidate.id === session.userId)
    if (!user) throw sessionExpired()
    return this.issueSession(user, session.familyId)
  }

  logout(refreshToken: string | undefined): void {
    if (refreshToken) this.refreshSessions.revoke(refreshToken)
  }

  async currentUser(accessToken: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sid: string, sub: string }>(accessToken)
      const user = this.users.find(candidate => candidate.id === payload.sub)
      if (!user || !this.refreshSessions.isFamilyActive(payload.sid)) throw new Error('Unknown or revoked session')
      return toPublicUser(user)
    } catch {
      throw new UnauthorizedException({ code: 'ACCESS_TOKEN_EXPIRED', message: 'Требуется вход' })
    }
  }

  private async issueSession(user: SeededUser, familyId?: string): Promise<IssuedSession> {
    const refreshSession = this.refreshSessions.create(user.id, familyId)
    return {
      accessToken: await this.jwtService.signAsync(
        { sid: refreshSession.familyId, sub: user.id },
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
      ),
      refreshToken: refreshSession.token,
      user: toPublicUser(user),
    }
  }
}