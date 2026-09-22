import { describe, expect, it, vi } from 'vitest'

import { createMockUsersData } from '../../app/users/mock-users-data'
import { createHttpUsersData } from '../../app/users/http-users-data'
import type { UsersDataError } from '../../app/users/users-data'

describe('Users data seam', () => {
  it('returns deterministic Organization Users with roles and without other Organizations', async () => {
    const users = createMockUsersData()

    const firstPage = await users.list({ page: 1, pageSize: 1, sortBy: 'name', sortDirection: 'asc' })
    expect(firstPage.total).toBe(3)
    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.items[0]).toMatchObject({
      id: 'user-1',
      email: 'user@example.invalid',
      name: 'Анна Волкова',
      role: 'admin',
      organization: { id: 'organization-1', name: 'Моя компания' },
    })

    const secondPage = await users.list({ page: 2, pageSize: 1, sortBy: 'name', sortDirection: 'asc' })
    expect(secondPage.items.map(user => user.name)).toEqual(['Иван Петров'])

    expect(JSON.stringify(firstPage)).not.toContain('foreign')
  })

  it('searches by name and email, filters by role and validates queries', async () => {
    const users = createMockUsersData()

    const searched = await users.list({ page: 1, pageSize: 10, search: 'волкова', sortBy: 'name', sortDirection: 'asc' })
    expect(searched.items.map(user => user.name)).toEqual(['Анна Волкова'])

    const searchedByEmail = await users.list({ page: 1, pageSize: 10, search: 'petrov', sortBy: 'name', sortDirection: 'asc' })
    expect(searchedByEmail.items.map(user => user.email)).toEqual(['petrov@example.invalid'])

    const admins = await users.list({ page: 1, pageSize: 10, role: 'admin', sortBy: 'name', sortDirection: 'asc' })
    expect(admins.items.map(user => user.role)).toEqual(['admin'])

    await expect(users.list({ page: 0, pageSize: 10, sortBy: 'name', sortDirection: 'asc' }))
      .rejects.toMatchObject<Partial<UsersDataError>>({ code: 'INVALID_USERS_QUERY', requestId: 'mock-users-query' })
    await expect(users.list({ page: 1, pageSize: 101, sortBy: 'name', sortDirection: 'asc' }))
      .rejects.toMatchObject<Partial<UsersDataError>>({ code: 'INVALID_USERS_QUERY' })
    await expect(users.list({ page: 1, pageSize: 10, sortBy: 'unsupported' as 'name', sortDirection: 'asc' }))
      .rejects.toMatchObject<Partial<UsersDataError>>({ code: 'INVALID_USERS_QUERY' })
  })
})

describe('HTTP Users data adapter', () => {
  it('implements the UsersData seam with bearer-authenticated versioned requests', async () => {
    const request = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0 })
    const data = createHttpUsersData({
      apiBase: 'http://api.example/api/v1/',
      accessToken: () => 'access-token',
      request,
    })

    await data.list({
      page: 2,
      pageSize: 5,
      search: 'анна',
      role: 'admin',
      sortBy: 'email',
      sortDirection: 'desc',
    })
    expect(request).toHaveBeenCalledWith(
      'http://api.example/api/v1/users?page=2&pageSize=5&search=%D0%B0%D0%BD%D0%BD%D0%B0&role=admin&sortBy=email&sortDirection=desc',
      { headers: { Authorization: 'Bearer access-token' } },
    )
  })

  it('preserves structured backend errors and rejects calls without a session token', async () => {
    const request = vi.fn().mockRejectedValue({
      data: {
        code: 'INVALID_USERS_QUERY',
        message: 'Неподдерживаемое поле сортировки.',
        requestId: 'request-1',
      },
    })
    const data = createHttpUsersData({ apiBase: '/api/v1', accessToken: () => 'token', request })
    await expect(data.list({ page: 1, pageSize: 10, sortBy: 'name', sortDirection: 'asc' }))
      .rejects.toMatchObject({
        name: 'UsersDataError',
        code: 'INVALID_USERS_QUERY',
        requestId: 'request-1',
      })

    const withoutToken = createHttpUsersData({ apiBase: '/api/v1', accessToken: () => null, request })
    await expect(withoutToken.list({ page: 1, pageSize: 10, sortBy: 'name', sortDirection: 'asc' }))
      .rejects.toMatchObject({
        code: 'AUTH_REQUIRED',
        requestId: 'users-http-auth',
      })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
