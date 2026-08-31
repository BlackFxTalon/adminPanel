export const apiContractVersion = 'v1' as const

export type ApiContractVersion = typeof apiContractVersion

export type UserRole = 'admin' | 'user'

export interface Organization {
  readonly id: string
  readonly name: string
}

export interface AuthenticatedUser {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly role: UserRole
  readonly organization: Organization
}

export interface AuthSessionResponse {
  readonly accessToken: string
  readonly user: AuthenticatedUser
}

export interface LoginRequest {
  readonly email: string
  readonly password: string
}