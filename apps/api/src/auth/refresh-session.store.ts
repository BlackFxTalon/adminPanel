import { Injectable } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'

import { REFRESH_TTL_MS } from './auth.constants.js'

interface RefreshSession {
  readonly userId: string
  readonly familyId: string
  readonly expiresAt: number
  revokedAt?: number
}

export interface CreatedRefreshSession {
  readonly familyId: string
  readonly token: string
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

@Injectable()
export class RefreshSessionStore {
  private readonly sessions = new Map<string, RefreshSession>()
  private readonly revokedFamilies = new Set<string>()

  create(userId: string, familyId = randomBytes(16).toString('base64url')): CreatedRefreshSession {
    const token = randomBytes(32).toString('base64url')
    const tokenHash = hashToken(token)
    this.sessions.set(tokenHash, {
      userId,
      familyId,
      expiresAt: Date.now() + REFRESH_TTL_MS,
    })
    return { familyId, token }
  }

  consume(token: string): RefreshSession | undefined {
    const session = this.sessions.get(hashToken(token))
    if (!session) return undefined
    if (session.revokedAt) {
      this.revokedFamilies.add(session.familyId)
      return undefined
    }
    if (session.expiresAt <= Date.now() || this.revokedFamilies.has(session.familyId)) return undefined
    session.revokedAt = Date.now()
    return session
  }

  revoke(token: string): void {
    const session = this.sessions.get(hashToken(token))
    if (session) this.revokedFamilies.add(session.familyId)
  }

  isFamilyActive(familyId: string): boolean {
    return !this.revokedFamilies.has(familyId)
  }
}