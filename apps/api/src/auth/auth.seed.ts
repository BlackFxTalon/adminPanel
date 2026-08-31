import type { AuthenticatedUser, UserRole } from '@admin-panel/contracts'
import { scryptSync } from 'node:crypto'

export interface SeededUser extends AuthenticatedUser {
  readonly passwordHash: Buffer
}

function requiredSeedValue(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required to create the local authentication seed`)
  return value
}

function createSeededUser(role: UserRole, emailName: string, passwordName: string): SeededUser {
  const email = requiredSeedValue(emailName)
  const password = requiredSeedValue(passwordName)

  const id = role === 'admin' ? 'user_admin_local' : 'user_local'
  return {
    id,
    email: email.toLowerCase(),
    name: role === 'admin' ? 'Local Admin' : 'Local User',
    role,
    organization: { id: 'org_local', name: 'Local Organization' },
    passwordHash: scryptSync(password, id, 64),
  }
}

export function createLocalAuthSeed(): readonly SeededUser[] {
  return [
    createSeededUser('admin', 'AUTH_TEST_ADMIN_EMAIL', 'AUTH_TEST_ADMIN_PASSWORD'),
    createSeededUser('user', 'AUTH_TEST_USER_EMAIL', 'AUTH_TEST_USER_PASSWORD'),
  ]
}