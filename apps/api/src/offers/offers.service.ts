import type {
  AuthenticatedUser,
  OfferSummary,
  OffersPage,
  OffersQuery,
} from '@admin-panel/contracts'
import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'

import type { Prisma } from '../generated/prisma/client.js'
import { PrismaService } from '../database/prisma.service.js'

type RawQuery = Readonly<Record<string, unknown>>

const sortFields: readonly OffersQuery['sortBy'][] = ['createdAt', 'number', 'ordersTotalMinor']
const sortDirections: readonly OffersQuery['sortDirection'][] = ['asc', 'desc']

function queryError(message: string): never {
  throw new BadRequestException({ code: 'INVALID_OFFERS_QUERY', message, requestId: randomUUID() })
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

function parseQuery(raw: RawQuery): OffersQuery {
  const sortBy = queryString(raw.sortBy) ?? 'createdAt'
  const sortDirection = queryString(raw.sortDirection) ?? 'desc'
  const search = queryString(raw.search)?.trim()
  const contragentId = queryString(raw.contragentId)
  if (!sortFields.includes(sortBy as OffersQuery['sortBy'])) queryError('Неподдерживаемое поле сортировки.')
  if (!sortDirections.includes(sortDirection as OffersQuery['sortDirection'])) queryError('Неподдерживаемое направление сортировки.')
  const pageSize = positiveInteger(raw.pageSize, 10, 'Размер страницы')
  if (pageSize > 100) queryError('Размер страницы должен быть от 1 до 100.')
  return {
    page: positiveInteger(raw.page, 1, 'Номер страницы'),
    pageSize,
    sortBy: sortBy as OffersQuery['sortBy'],
    sortDirection: sortDirection as OffersQuery['sortDirection'],
    ...(search ? { search } : {}),
    ...(contragentId ? { contragentId } : {}),
  }
}

function minorUnits(value: bigint): number {
  const result = Number(value)
  if (!Number.isSafeInteger(result)) throw new Error('Money value exceeds the supported contract range')
  return result
}

function contragentFilterWhere(organizationId: string): Prisma.ContragentWhereInput {
  return {
    organizationId,
    offers: { some: { organizationId } },
  }
}

interface OfferRecord {
  readonly id: string
  readonly createdAt: Date
  readonly number: string
  readonly title: string
  readonly contragent?: { readonly id: string, readonly displayName: string } | null
  readonly orders?: readonly { readonly totalMinor: bigint }[]
}

function toSummary(
  record: OfferRecord,
  organization: { readonly id: string, readonly name: string },
  totals?: { readonly ordersCount: number, readonly ordersTotalMinor: number },
): OfferSummary {
  const ordersCount = totals?.ordersCount ?? record.orders?.length ?? 0
  const ordersTotalMinor = totals
    ? totals.ordersTotalMinor
    : (record.orders ?? []).reduce((sum, order) => sum + minorUnits(order.totalMinor), 0)
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    number: record.number,
    title: record.title,
    ...(record.contragent ? { contragent: { id: record.contragent.id, label: record.contragent.displayName } } : {}),
    currency: 'RUB',
    ordersCount,
    ordersTotalMinor,
    organization: { id: organization.id, name: organization.name },
  }
}

@Injectable()
export class OffersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, rawQuery: RawQuery): Promise<OffersPage> {
    const query = parseQuery(rawQuery)
    const search = query.search
    const where: Prisma.OfferWhereInput = {
      organizationId: user.organization.id,
      ...(query.contragentId ? { contragentId: query.contragentId } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } },
              { contragent: { displayName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }
    return query.sortBy === 'ordersTotalMinor'
      ? this.listSortedByOrderTotals(user, query, where)
      : this.listSortedByOfferField(user, query, where)
  }

  private async listSortedByOfferField(
    user: AuthenticatedUser,
    query: OffersQuery,
    where: Prisma.OfferWhereInput,
  ): Promise<OffersPage> {
    const [records, total, contragents] = await this.prisma.client.$transaction([
      this.prisma.client.offer.findMany({
        where,
        include: {
          contragent: true,
          orders: { select: { totalMinor: true } },
        },
        orderBy: { [query.sortBy]: query.sortDirection },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.client.offer.count({ where }),
      this.prisma.client.contragent.findMany({
        where: contragentFilterWhere(user.organization.id),
        orderBy: { displayName: 'asc' },
      }),
    ])
    return {
      items: records.map(record => toSummary(record, user.organization)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      filterOptions: {
        contragents: contragents.map(candidate => ({ id: candidate.id, label: candidate.displayName })),
      },
    }
  }

  /**
   * Sorting by aggregated related-Order totals must be global: matching Offers are
   * enriched and ordered before pagination instead of re-sorting a single page.
   */
  private async listSortedByOrderTotals(
    user: AuthenticatedUser,
    query: OffersQuery,
    where: Prisma.OfferWhereInput,
  ): Promise<OffersPage> {
    const [records, orders, contragents] = await this.prisma.client.$transaction([
      this.prisma.client.offer.findMany({ where, include: { contragent: true } }),
      this.prisma.client.order.findMany({
        where: {
          organizationId: user.organization.id,
          offerId: { not: null },
        },
        select: { offerId: true, totalMinor: true },
      }),
      this.prisma.client.contragent.findMany({
        where: contragentFilterWhere(user.organization.id),
        orderBy: { displayName: 'asc' },
      }),
    ])
    const totals = new Map<string, { ordersCount: number, ordersTotalMinor: number }>()
    for (const order of orders) {
      if (!order.offerId) continue
      const current = totals.get(order.offerId) ?? { ordersCount: 0, ordersTotalMinor: 0 }
      totals.set(order.offerId, {
        ordersCount: current.ordersCount + 1,
        ordersTotalMinor: current.ordersTotalMinor + minorUnits(order.totalMinor),
      })
    }
    const totalsByOfferId = totals
    const items = records
      .map(record => toSummary(record, user.organization, totalsByOfferId.get(record.id)))
      .sort((left, right) => {
        const leftValue = left.ordersTotalMinor
        const rightValue = right.ordersTotalMinor
        return (leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0)
          * (query.sortDirection === 'asc' ? 1 : -1)
      })
    return {
      items: items.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: items.length,
      filterOptions: {
        contragents: contragents.map(candidate => ({ id: candidate.id, label: candidate.displayName })),
      },
    }
  }
}
