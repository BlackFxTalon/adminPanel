import type { Organization, SortDirection, UserRole } from './index.js'

export const userRoles = ['admin', 'user'] as const satisfies readonly UserRole[]

export const userRoleLabels: Readonly<Record<UserRole, string>> = {
  admin: 'Администратор',
  user: 'Пользователь',
}

export interface UserSummary {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly role: UserRole
  readonly organization: Organization
}

export type UsersSortField = 'name' | 'email'

export interface UsersQuery {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly role?: UserRole
  readonly sortBy: UsersSortField
  readonly sortDirection: SortDirection
}

export interface UsersPage {
  readonly items: readonly UserSummary[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
}
