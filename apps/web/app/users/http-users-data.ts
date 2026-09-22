import type { StructuredError, UsersPage, UsersQuery } from '@admin-panel/contracts'

import type { UsersData } from './users-data'
import { UsersDataError } from './users-data'

interface HttpUsersDataOptions {
  readonly apiBase: string
  readonly accessToken: () => string | null
  readonly request: (url: string, options: { headers: Record<string, string> }) => Promise<unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStructuredError(value: unknown): value is StructuredError {
  return isRecord(value)
    && typeof value.code === 'string'
    && typeof value.message === 'string'
    && typeof value.requestId === 'string'
}

function normalizeBase(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

export function createHttpUsersData(options: HttpUsersDataOptions): UsersData {
  async function authenticatedRequest<T>(path: string): Promise<T> {
    const token = options.accessToken()
    if (!token) {
      throw new UsersDataError({
        code: 'AUTH_REQUIRED',
        message: 'Для работы с Users требуется активная сессия.',
        requestId: 'users-http-auth',
      })
    }
    try {
      return await options.request(`${normalizeBase(options.apiBase)}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      }) as T
    } catch (error: unknown) {
      if (error instanceof UsersDataError) throw error
      const body = isRecord(error) ? error.data : undefined
      if (isStructuredError(body)) throw new UsersDataError(body)
      throw new UsersDataError({
        code: 'USERS_REQUEST_FAILED',
        message: 'Не удалось загрузить Users.',
        requestId: 'users-http-request',
      })
    }
  }

  return {
    list(query: UsersQuery): Promise<UsersPage> {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        ...(query.search ? { search: query.search } : {}),
        ...(query.role ? { role: query.role } : {}),
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
      })
      return authenticatedRequest(`/users?${params.toString()}`)
    },
  }
}
