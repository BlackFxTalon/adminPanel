import type { UsersPage, UsersQuery } from '@admin-panel/contracts'

import type { UsersData } from './users-data'
import { UsersDataError, mockUsers } from './users-data'

const sortFields: readonly UsersQuery['sortBy'][] = ['name', 'email']
const sortDirections: readonly UsersQuery['sortDirection'][] = ['asc', 'desc']
function invalidQuery(message: string): never {
  throw new UsersDataError({ code: 'INVALID_USERS_QUERY', message, requestId: 'mock-users-query' })
}

function validateQuery(query: UsersQuery): void {
  if (!Number.isInteger(query.page) || query.page < 1) invalidQuery('Номер страницы должен быть положительным целым числом.')
  if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) invalidQuery('Размер страницы должен быть от 1 до 100.')
  if (!sortFields.includes(query.sortBy)) invalidQuery('Неподдерживаемое поле сортировки.')
  if (!sortDirections.includes(query.sortDirection)) invalidQuery('Неподдерживаемое направление сортировки.')
}

function compare(left: UsersPage['items'][number], right: UsersPage['items'][number], field: UsersQuery['sortBy']): number {
  const leftValue = left[field]
  const rightValue = right[field]
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
}

export function createMockUsersData(): UsersData {
  return {
    async list(query: UsersQuery): Promise<UsersPage> {
      validateQuery(query)
      const search = query.search?.trim().toLocaleLowerCase('ru-RU')
      const matching = mockUsers
        .filter(user => !query.role || user.role === query.role)
        .filter(user => !search || [
          user.name,
          user.email,
        ].some(value => value.toLocaleLowerCase('ru-RU').includes(search)))
        .toSorted((left, right) => compare(left, right, query.sortBy) * (query.sortDirection === 'asc' ? 1 : -1))
      const start = (query.page - 1) * query.pageSize
      return {
        items: matching.slice(start, start + query.pageSize),
        page: query.page,
        pageSize: query.pageSize,
        total: matching.length,
      }
    },
  }
}
