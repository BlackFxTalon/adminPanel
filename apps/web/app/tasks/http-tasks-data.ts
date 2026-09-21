import type {
  CreateTaskInput,
  StructuredError,
  TaskCreationOptions,
  TaskDetail,
  TasksPage,
  TasksQuery,
} from '@admin-panel/contracts'

import type { TasksData } from './tasks-data'
import { TasksDataError } from './tasks-data'

interface HttpRequestOptions {
  readonly method?: 'POST'
  readonly body?: unknown
  readonly headers: Readonly<Record<string, string>>
}

interface HttpTasksDataOptions {
  readonly apiBase: string
  readonly accessToken: () => string | null
  readonly request: (url: string, options: HttpRequestOptions) => Promise<unknown>
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

export function createHttpTasksData(options: HttpTasksDataOptions): TasksData {
  const base = normalizeBase(options.apiBase)

  async function authenticatedRequest<T>(path: string, requestOptions: Omit<HttpRequestOptions, 'headers'> = {}, fallbackErrorMessage = 'Не удалось загрузить Tasks.'): Promise<T> {
    const token = options.accessToken()
    if (!token) {
      throw new TasksDataError({
        code: 'AUTH_REQUIRED',
        message: 'Для работы с Tasks требуется активная сессия.',
        requestId: 'tasks-http-auth',
      })
    }
    try {
      return await options.request(`${base}${path}`, {
        ...requestOptions,
        headers: { Authorization: `Bearer ${token}` },
      }) as T
    } catch (error: unknown) {
      if (error instanceof TasksDataError) throw error
      const body = isRecord(error) ? error.data : undefined
      if (isStructuredError(body)) throw new TasksDataError(body)
      throw new TasksDataError({
        code: 'TASKS_REQUEST_FAILED',
        message: fallbackErrorMessage,
        requestId: 'tasks-http-request',
      })
    }
  }

  return {
    list(query: TasksQuery): Promise<TasksPage> {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        ...(query.search ? { search: query.search } : {}),
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        ...(query.status ? { status: query.status } : {}),
        ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
        ...(query.contragentId ? { contragentId: query.contragentId } : {}),
        ...(query.orderId ? { orderId: query.orderId } : {}),
        ...(query.mine ? { mine: 'true' } : {}),
      })
      return authenticatedRequest(`/tasks?${params.toString()}`)
    },

    creationOptions(): Promise<TaskCreationOptions> {
      return authenticatedRequest('/tasks/creation-options')
    },

    create(input: CreateTaskInput): Promise<TaskDetail> {
      return authenticatedRequest('/tasks', { method: 'POST', body: input }, 'Не удалось сохранить задачу.')
    },
  }
}
