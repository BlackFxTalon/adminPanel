import type { OrderReference, Organization, SortDirection } from './index.js'

export const taskStatuses = ['open', 'in_progress', 'done', 'cancelled'] as const

export type TaskStatus = typeof taskStatuses[number]

export const taskPriorities = ['low', 'medium', 'high'] as const

export type TaskPriority = typeof taskPriorities[number]

export const taskStatusLabels: Readonly<Record<TaskStatus, string>> = {
  open: 'Открыта',
  in_progress: 'В работе',
  done: 'Выполнена',
  cancelled: 'Отменена',
}

export const taskPriorityLabels: Readonly<Record<TaskPriority, string>> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

export interface TaskSummary {
  readonly id: string
  readonly createdAt: string
  readonly number: string
  readonly title: string
  readonly status: TaskStatus
  readonly priority: TaskPriority
  readonly assignee: { readonly id: string, readonly name: string }
  readonly contragent?: OrderReference
  readonly order?: OrderReference
  readonly organization: Organization
}

export interface TasksQuery {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sortBy: 'createdAt' | 'number' | 'title'
  readonly sortDirection: SortDirection
  readonly status?: TaskStatus
  readonly assigneeId?: string
  readonly contragentId?: string
  readonly orderId?: string
  readonly mine?: boolean
}

export interface TasksPage {
  readonly items: readonly TaskSummary[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
  readonly filterOptions: {
    readonly assignees: readonly { readonly id: string, readonly name: string }[]
    readonly contragents: readonly OrderReference[]
    readonly orders: readonly OrderReference[]
  }
}

export interface TaskCreationOptions {
  readonly assignees: readonly { readonly id: string, readonly name: string }[]
  readonly contragents: readonly OrderReference[]
  readonly orders: readonly OrderReference[]
}

export interface CreateTaskInput {
  readonly title: string
  readonly description?: string
  readonly priority: TaskPriority
  readonly assigneeId: string
  readonly contragentId?: string
  readonly orderId?: string
}

export interface TaskDetail extends TaskSummary {
  readonly description?: string
}
