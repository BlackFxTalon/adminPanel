import type { AuthenticatedUser, OfferSummary, OffersPage, OffersQuery, SortDirection } from '@admin-panel/contracts'

import { createMockOrdersData } from '../orders/mock-orders-data'
import type { OffersData } from './offers-data'
import { OffersDataError } from './offers-data'

interface MockOfferRecord {
  readonly id: string
  readonly createdAt: string
  readonly number: string
  readonly title: string
  readonly contragent?: { readonly id: string, readonly label: string }
}

const records: readonly MockOfferRecord[] = [
  {
    id: 'offer-1',
    createdAt: '2026-07-02T10:00:00.000Z',
    number: 'OFF-2026-001',
    title: 'Предложение на редукторы',
    contragent: { id: 'contragent-2', label: 'Уралредуктор' },
  },
  {
    id: 'offer-2',
    createdAt: '2026-07-10T14:30:00.000Z',
    number: 'OFF-2026-002',
    title: 'Предложение на логистику',
  },
]

const sortFields: readonly OffersQuery['sortBy'][] = ['createdAt', 'number', 'ordersTotalMinor']
const sortDirections: readonly SortDirection[] = ['asc', 'desc']
function invalidQuery(message: string): never {
  throw new OffersDataError({ code: 'INVALID_OFFERS_QUERY', message, requestId: 'mock-offers-query' })
}

function validateQuery(query: OffersQuery): void {
  if (!Number.isInteger(query.page) || query.page < 1) invalidQuery('Номер страницы должен быть положительным целым числом.')
  if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) invalidQuery('Размер страницы должен быть от 1 до 100.')
  if (!sortFields.includes(query.sortBy)) invalidQuery('Неподдерживаемое поле сортировки.')
  if (!sortDirections.includes(query.sortDirection)) invalidQuery('Неподдерживаемое направление сортировки.')
}

interface AssociatedOrderTotals {
  readonly offer?: { readonly id: string }
  readonly totalMinor: number
}

function offerTotals(orders: readonly AssociatedOrderTotals[], offerId: string): { ordersCount: number, ordersTotalMinor: number } {
  return orders.reduce(
    (totals, order) => order.offer?.id === offerId
      ? { ordersCount: totals.ordersCount + 1, ordersTotalMinor: totals.ordersTotalMinor + order.totalMinor }
      : totals,
    { ordersCount: 0, ordersTotalMinor: 0 },
  )
}

function compare(left: OfferSummary, right: OfferSummary, field: OffersQuery['sortBy']): number {
  const leftValue = left[field]
  const rightValue = right[field]
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
}

export function createMockOffersData(currentUser: () => AuthenticatedUser): OffersData {
  return {
    async list(query: OffersQuery): Promise<OffersPage> {
      validateQuery(query)
      const ordersPage = await createMockOrdersData(currentUser).list({
        page: 1,
        pageSize: 100,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      })
      const enriched: readonly OfferSummary[] = records.map(record => ({
        ...record,
        currency: 'RUB',
        organization: ordersPage.items[0]?.organization ?? { id: 'organization-1', name: 'Моя компания' },
        ...offerTotals(ordersPage.items, record.id),
      }))
      const search = query.search?.trim().toLocaleLowerCase('ru-RU')
      const matching = enriched
        .filter(record => !query.contragentId || record.contragent?.id === query.contragentId)
        .filter(record => !search || [
          record.number,
          record.title,
          record.contragent?.label ?? '',
        ].some(value => value.toLocaleLowerCase('ru-RU').includes(search)))
        .toSorted((left, right) => compare(left, right, query.sortBy) * (query.sortDirection === 'asc' ? 1 : -1))
      const start = (query.page - 1) * query.pageSize
      return {
        items: matching.slice(start, start + query.pageSize),
        page: query.page,
        pageSize: query.pageSize,
        total: matching.length,
        filterOptions: {
          contragents: [...new Map(
            enriched
              .filter(record => record.contragent !== undefined)
              .map(record => [record.contragent!.id, record.contragent!]),
          ).values()],
        },
      }
    },
  }
}
