import type {
  AuthenticatedUser,
  CreateOrderInput,
  OrderDetail,
  OrderSortField,
  OrderStatus,
  OrdersPage,
  OrdersQuery,
  SortDirection,
} from '@admin-panel/contracts'

import { validateCreateOrderInput } from './create-order-validation'
import { isOrderStatus } from './order-status'
import type { OrdersData } from './orders-data'
import { OrdersDataError } from './orders-data'

const organization = { id: 'organization-1', name: 'Моя компания' } as const
const anna = { id: 'user-1', name: 'Анна Волкова' } as const
const ivan = { id: 'user-2', name: 'Иван Петров' } as const
const contragents = {
  factory: { id: 'contragent-1', label: 'Уралмашзавод' },
  reducer: { id: 'contragent-2', label: 'Уралредуктор' },
  logistics: { id: 'contragent-3', label: 'ТрансЛогистика' },
} as const
const offers = [
  { id: 'offer-1', label: 'Предложение на редукторы' },
  { id: 'offer-2', label: 'Предложение на логистику' },
] as const

const seedRecords: readonly OrderDetail[] = [
  order('order-1', '2026-08-01T09:00:00.000Z', 'ORD-2026-001', contragents.factory, 'pending_approval', ivan, [
    item('item-1', 'Комплект крепежа', 10, 125000),
  ]),
  order('order-2', '2026-08-04T12:00:00.000Z', 'ORD-2026-002', contragents.reducer, 'in_work', anna, [
    item('item-2', 'Промышленный редуктор', 2, 14500000),
    item('item-3', 'Муфта', 4, 250000),
  ]),
  order('order-3', '2026-08-08T08:30:00.000Z', 'ORD-2026-003', contragents.logistics, 'cargo_in_transit', ivan, [
    item('item-4', 'Транспортный контейнер', 1, 9600000),
  ]),
  order('order-4', '2026-08-12T10:15:00.000Z', 'ORD-2026-004', contragents.factory, 'completed', anna, [
    item('item-5', 'Электродвигатель', 3, 8200000),
  ]),
  order('order-5', '2026-08-16T14:45:00.000Z', 'ORD-2026-005', contragents.reducer, 'cancelled', ivan, [
    item('item-6', 'Вал приводной', 5, 3100000),
  ]),
  order('order-6', '2026-08-20T11:20:00.000Z', 'ORD-2026-006', contragents.factory, 'awaiting_payment', anna, [
    item('item-7', 'Насосный агрегат', 1, 78000000),
  ]),
]

function item(id: string, name: string, quantity: number, unitPriceMinor: number) {
  return { id, name, quantity, unitPriceMinor, amountMinor: quantity * unitPriceMinor }
}

function order(
  id: string,
  createdAt: string,
  number: string,
  contragent: OrderDetail['contragent'],
  status: OrderStatus,
  responsibleUser: OrderDetail['responsibleUser'],
  items: OrderDetail['items'],
): OrderDetail {
  return {
    id,
    createdAt,
    number,
    contragent,
    totalMinor: items.reduce((total, current) => total + current.amountMinor, 0),
    currency: 'RUB',
    status,
    responsibleUser,
    organization,
    items,
  }
}

const sortFields: readonly OrderSortField[] = ['createdAt', 'number', 'totalMinor']
const sortDirections: readonly SortDirection[] = ['asc', 'desc']
function invalidQuery(message: string): never {
  throw new OrdersDataError({ code: 'INVALID_ORDERS_QUERY', message, requestId: 'mock-orders-query' })
}

function validateQuery(query: OrdersQuery): void {
  if (!Number.isInteger(query.page) || query.page < 1) invalidQuery('Номер страницы должен быть положительным целым числом.')
  if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) invalidQuery('Размер страницы должен быть от 1 до 100.')
  if (!sortFields.includes(query.sortBy)) invalidQuery('Неподдерживаемое поле сортировки.')
  if (!sortDirections.includes(query.sortDirection)) invalidQuery('Неподдерживаемое направление сортировки.')
  if (query.status && !isOrderStatus(query.status)) invalidQuery('Неподдерживаемый статус Order.')
}

function validateCreateInput(input: CreateOrderInput): void {
  const fieldErrors = validateCreateOrderInput(input, {
    contragents: Object.values(contragents),
    offers,
  })
  if (Object.keys(fieldErrors).length > 0) {
    throw new OrdersDataError({
      code: 'ORDER_VALIDATION_FAILED',
      message: 'Исправьте ошибки в форме.',
      requestId: 'mock-order-create',
      fieldErrors,
    })
  }
}

function compare(left: OrderDetail, right: OrderDetail, field: OrderSortField): number {
  const leftValue = left[field]
  const rightValue = right[field]
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0
}

export function createMockOrdersData(currentUser: () => AuthenticatedUser): OrdersData {
  const records = [...seedRecords]

  return {
    async list(query: OrdersQuery): Promise<OrdersPage> {
      validateQuery(query)
      const search = query.search?.trim().toLocaleLowerCase('ru-RU')
      const matching = records
        .filter(record => !query.status || record.status === query.status)
        .filter(record => !query.contragentId || record.contragent.id === query.contragentId)
        .filter(record => !search || [
          record.number,
          record.contragent.label,
          record.responsibleUser.name,
          ...record.items.map(candidate => candidate.name),
        ].some(value => value.toLocaleLowerCase('ru-RU').includes(search)))
        .toSorted((left, right) => compare(left, right, query.sortBy) * (query.sortDirection === 'asc' ? 1 : -1))
      const start = (query.page - 1) * query.pageSize
      return {
        items: matching.slice(start, start + query.pageSize),
        page: query.page,
        pageSize: query.pageSize,
        total: matching.length,
        filterOptions: { contragents: Object.values(contragents) },
      }
    },

    async detail(id: string): Promise<OrderDetail> {
      const record = records.find(candidate => candidate.id === id)
      if (!record) {
        throw new OrdersDataError({
          code: 'ORDER_NOT_FOUND',
          message: 'Order не найден.',
          requestId: 'mock-order-detail',
        })
      }
      return record
    },

    async creationOptions() {
      return {
        contragents: Object.values(contragents),
        offers,
      }
    },

    async create(input: CreateOrderInput): Promise<OrderDetail> {
      validateCreateInput(input)
      const user = currentUser()
      const contragent = Object.values(contragents).find(candidate => candidate.id === input.contragentId)!
      const offer = offers.find(candidate => candidate.id === input.offerId)
      const sequence = records.length + 1
      const id = `order-${sequence}`
      const createdItem = (candidate: CreateOrderInput['items'][number], index: number) => ({
        id: `${id}-item-${index + 1}`,
        name: candidate.name.trim(),
        quantity: candidate.quantity,
        unitPriceMinor: candidate.unitPriceMinor,
        amountMinor: candidate.quantity * candidate.unitPriceMinor,
        ...(candidate.characteristics?.trim() ? { characteristics: candidate.characteristics.trim() } : {}),
        ...(candidate.weightGrams !== undefined ? { weightGrams: candidate.weightGrams } : {}),
        ...(candidate.volumeCubicCentimeters !== undefined ? { volumeCubicCentimeters: candidate.volumeCubicCentimeters } : {}),
      })
      const [firstInput, ...remainingInputs] = input.items
      const items: OrderDetail['items'] = [
        createdItem(firstInput, 0),
        ...remainingInputs.map((candidate, index) => createdItem(candidate, index + 1)),
      ]
      const created: OrderDetail = {
        id,
        number: `ORD-2026-${String(sequence).padStart(3, '0')}`,
        createdAt: new Date(Date.parse('2026-08-24T09:00:00.000Z') + (sequence - 7) * 86_400_000).toISOString(),
        contragent,
        ...(offer ? { offer } : {}),
        status: 'pending_approval',
        currency: 'RUB',
        responsibleUser: { id: user.id, name: user.name },
        organization: user.organization,
        items,
        totalMinor: items.reduce((total, candidate) => total + candidate.amountMinor, 0),
      }
      records.unshift(created)
      return created
    },
  }
}
