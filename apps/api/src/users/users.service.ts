import type { AuthenticatedUser, UsersPage, UsersQuery } from '@admin-panel/contracts'
import { userRoles } from '@admin-panel/contracts'
import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../database/prisma.service.js'

type RawQuery = Readonly<Record<string, unknown>>

const sortFields: readonly UsersQuery['sortBy'][] = ['name', 'email']

function queryError(message: string): never {
  throw new BadRequestException({ code: 'INVALID_USERS_QUERY', message, requestId: randomUUID() })
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function positiveInteger(value: unknown, fallback: number, name: string): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) queryError(`${name} должен быть положительным целым числом.`)
  return parsed
}

function parseQuery(raw: RawQuery): UsersQuery {
  const sortBy = queryString(raw.sortBy) ?? 'name'
  const sortDirection = queryString(raw.sortDirection) ?? 'asc'
  const search = queryString(raw.search)?.trim()
  const role = queryString(raw.role)
  if (!sortFields.includes(sortBy as UsersQuery['sortBy'])) queryError('Неподдерживаемое поле сортировки.')
  if (!['asc', 'desc'].includes(sortDirection)) queryError('Неподдерживаемое направление сортировки.')
  if (role && !userRoles.includes(role as UsersQuery['role'] & string)) queryError('Неподдерживаемая роль User.')
  const pageSize = positiveInteger(raw.pageSize, 10, 'Размер страницы')
  if (pageSize > 100) queryError('Размер страницы должен быть от 1 до 100.')
  return {
    page: positiveInteger(raw.page, 1, 'Номер страницы'),
    pageSize,
    sortBy: sortBy as UsersQuery['sortBy'],
    sortDirection: sortDirection as UsersQuery['sortDirection'],
    ...(search ? { search } : {}),
    ...(role ? { role: role as UsersQuery['role'] } : {}),
  } as UsersQuery
}

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, rawQuery: RawQuery): Promise<UsersPage> {
    const query = parseQuery(rawQuery)
    const search = query.search
    const where: Prisma.UserWhereInput = {
      organizationId: user.organization.id,
      ...(query.role ? { role: query.role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
    const [records, total] = await this.prisma.client.$transaction([
      this.prisma.client.user.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDirection },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.client.user.count({ where }),
    ])
    return {
      items: records,
      page: query.page,
      pageSize: query.pageSize,
      total,
    }
  }
}
