import type {
  AuthenticatedUser,
  CreateTaskInput,
  OrderSummary,
  TaskCreationOptions,
  TaskDetail,
  TasksPage,
  TasksQuery,
} from '@admin-panel/contracts'

import { createMockOrdersData } from '../orders/mock-orders-data'
import type { TasksData } from './tasks-data'
import { TasksDataError } from './tasks-data'

const organization = { id: 'organization-1', name: 'Моя компания' } as const
const anna = { id: 'user-1', name: 'Анна Волкова' } as const
const ivan = { id: 'user-2', name: 'Иван Петров' } as const
const assignees = [anna, ivan] as const

interface MockTaskRecord {
  readonly id: string
  readonly createdAt: string
  readonly number: string
  readonly title: string
  readonly description?: string
  readonly status: TaskDetail['status']
  readonly priority: TaskDetail['priority']
  readonly assigneeId: string
  readonly contragentId?: string
  readonly orderId?: string
}

const seedRecords: readonly MockTaskRecord[] = [
  {
    id: 'task-1',
    createdAt: '2026-08-18T09:30:00.000Z',
    number: 'TASK-2026-001',
    title: 'Позвонить контрагенту',
    description: 'Обсудить детали поставки.',
    status: 'open',
    priority: 'high',
    assigneeId: 'user-1',
    contragentId: 'contragent-1',
    orderId: 'order-1',
  },
  {
    id: 'task-2',
    createdAt: '2026-08-20T11:00:00.000Z',
    number: 'TASK-2026-002',
    title: 'Подготовить коммерческое предложение',
    status: 'in_progress',
    priority: 'medium',
    assigneeId: 'user-2',
  },
]

const sortFields: readonly TasksQuery['sortBy'][] = ['createdAt', 'number', 'title']
const sortDirections: readonly TasksQuery['sortDirection'][] = ['asc', 'desc']
function invalidQuery(message: string): never {
  throw new TasksDataError({ code: 'INVALID_TASKS_QUERY', message, requestId: 'mock-tasks-query' })
}

function validateQuery(query: TasksQuery): void {
  if (!Number.isInteger(query.page) || query.page < 1) invalidQuery('Номер страницы должен быть положительным целым числом.')
  if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) invalidQuery('Размер страницы должен быть от 1 до 100.')
  if (!sortFields.includes(query.sortBy)) invalidQuery('Неподдерживаемое поле сортировки.')
  if (!sortDirections.includes(query.sortDirection)) invalidQuery('Неподдерживаемое направление сортировки.')
}

function contragentReference(id: string): { id: string, label: string } {
  const labels: Record<string, string> = {
    'contragent-1': 'Уралмашзавод',
    'contragent-2': 'Уралредуктор',
    'contragent-3': 'ТрансЛогистика',
  }
  return { id, label: labels[id] ?? id }
}

export function createMockTasksData(currentUser: () => AuthenticatedUser): TasksData {
  const records: MockTaskRecord[] = [...seedRecords]
  return {
    async list(query: TasksQuery): Promise<TasksPage> {
      validateQuery(query)
      const ordersPage = await createMockOrdersData(currentUser).list({
        page: 1,
        pageSize: 100,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      })
      const orders: readonly OrderSummary[] = ordersPage.items
      const search = query.search?.trim().toLocaleLowerCase('ru-RU')
      const assigneeById = new Map<string, { readonly id: string, readonly name: string }>(
        assignees.map(candidate => [candidate.id, candidate]),
      )
      const enriched = records
        .filter(record => !query.status || record.status === query.status)
        .filter(record => !query.assigneeId || record.assigneeId === query.assigneeId)
        .filter(record => !query.mine || record.assigneeId === currentUser().id)
        .filter(record => !query.contragentId || record.contragentId === query.contragentId)
        .filter(record => !query.orderId || record.orderId === query.orderId)
        .filter(record => !search || [
          record.number,
          record.title,
          record.description ?? '',
        ].some(value => value.toLocaleLowerCase('ru-RU').includes(search)))
        .map(record => ({
          id: record.id,
          createdAt: record.createdAt,
          number: record.number,
          title: record.title,
          ...(record.description ? { description: record.description } : {}),
          status: record.status,
          priority: record.priority,
          assignee: assigneeById.get(record.assigneeId) ?? { id: record.assigneeId, name: record.assigneeId },
          ...(record.contragentId ? { contragent: contragentReference(record.contragentId) } : {}),
          ...(record.orderId
            ? { order: orders.filter(order => order.id === record.orderId)
                .map(order => ({ id: order.id, label: order.number }))[0] ?? { id: record.orderId, label: record.orderId } }
            : {}),
          organization,
        }))
        .toSorted((left, right) => {
          const leftValue = left[query.sortBy]
          const rightValue = right[query.sortBy]
          return (leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0) * (query.sortDirection === 'asc' ? 1 : -1)
        })
      const start = (query.page - 1) * query.pageSize
      return {
        items: enriched.slice(start, start + query.pageSize),
        page: query.page,
        pageSize: query.pageSize,
        total: enriched.length,
        filterOptions: {
          assignees: [...assignees],
          contragents: ordersPage.filterOptions.contragents,
          orders: orders.map(order => ({ id: order.id, label: order.number })),
        },
      }
    },

    async creationOptions(): Promise<TaskCreationOptions> {
      const ordersPage = await createMockOrdersData(currentUser).list({
        page: 1,
        pageSize: 100,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      })
      return {
        assignees: [...assignees],
        contragents: ordersPage.filterOptions.contragents,
        orders: ordersPage.items.map(order => ({ id: order.id, label: order.number })),
      }
    },

    async create(input: CreateTaskInput): Promise<TaskDetail> {
      if (!input.title.trim()) {
        throw new TasksDataError({
          code: 'TASK_VALIDATION_FAILED',
          message: 'Исправьте ошибки в форме.',
          requestId: 'mock-task-create',
          fieldErrors: { title: ['Введите название задачи.'] },
        })
      }
      const user = currentUser()
      const created: TaskDetail = {
        id: `task-${records.length + 1}`,
        createdAt: '2026-08-24T10:00:00.000Z',
        number: `TASK-${new Date().getUTCFullYear()}-${String(records.length + 1).padStart(3, '0')}`,
        title: input.title.trim(),
        ...(input.description?.trim() ? { description: input.description.trim() } : {}),
        status: 'open',
        priority: input.priority,
        assignee: assignees.find(candidate => candidate.id === input.assigneeId) ?? { id: user.id, name: user.name },
        ...(input.contragentId ? { contragent: contragentReference(input.contragentId) } : {}),
        ...(input.orderId ? { order: { id: input.orderId, label: input.orderId } } : {}),
        organization: user.organization,
      }
      records.unshift({
        id: created.id,
        createdAt: created.createdAt,
        number: created.number,
        title: created.title,
        ...(created.description ? { description: created.description } : {}),
        status: created.status,
        priority: created.priority,
        assigneeId: created.assignee.id,
        ...(created.contragent ? { contragentId: created.contragent.id } : {}),
        ...(created.order ? { orderId: created.order.id } : {}),
      })
      return created
    },
  }
}
