import type { UserSummary, UsersPage, UsersQuery, StructuredError } from '@admin-panel/contracts'

export interface UsersData {
  list(query: UsersQuery): Promise<UsersPage>
}

export class UsersDataError extends Error implements StructuredError {
  readonly code: string
  readonly requestId: string

  constructor(error: StructuredError) {
    super(error.message)
    this.name = 'UsersDataError'
    this.code = error.code
    this.requestId = error.requestId
  }
}

export const mockUsers: readonly UserSummary[] = [
  {
    id: 'user-1',
    email: 'user@example.invalid',
    name: 'Анна Волкова',
    role: 'admin',
    organization: { id: 'organization-1', name: 'Моя компания' },
  },
  {
    id: 'user-2',
    email: 'petrov@example.invalid',
    name: 'Иван Петров',
    role: 'user',
    organization: { id: 'organization-1', name: 'Моя компания' },
  },
  {
    id: 'user-3',
    email: 'sokolova@example.invalid',
    name: 'Мария Соколова',
    role: 'user',
    organization: { id: 'organization-1', name: 'Моя компания' },
  },
]
