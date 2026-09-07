import type {
  CreateOrderInput,
  OrderCreationOptions,
  OrderDetail,
  OrdersPage,
  OrdersQuery,
  StructuredError,
} from '@admin-panel/contracts'

import type { OrdersData } from './orders-data'
import { OrdersDataError } from './orders-data'

interface HttpRequestOptions {
  readonly method?: 'POST'
  readonly body?: unknown
  readonly headers: Readonly<Record<string, string>>
}

interface HttpOrdersDataOptions {
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

export function createHttpOrdersData(options: HttpOrdersDataOptions): OrdersData {
  const base = normalizeBase(options.apiBase)

  async function authenticatedRequest<T>(path: string, requestOptions: Omit<HttpRequestOptions, 'headers'> = {}): Promise<T> {
    const token = options.accessToken()
    if (!token) {
      throw new OrdersDataError({
        code: 'AUTH_REQUIRED',
        message: 'Для работы с Orders требуется активная сессия.',
        requestId: 'orders-http-auth',
      })
    }
    try {
      return await options.request(`${base}${path}`, {
        ...requestOptions,
        headers: { Authorization: `Bearer ${token}` },
      }) as T
    } catch (error: unknown) {
      if (error instanceof OrdersDataError) throw error
      const body = isRecord(error) ? error.data : undefined
      if (isStructuredError(body)) throw new OrdersDataError(body)
      throw new OrdersDataError({
        code: 'ORDERS_REQUEST_FAILED',
        message: 'Не удалось загрузить Orders.',
        requestId: 'orders-http-request',
      })
    }
  }

  return {
    list(query: OrdersQuery): Promise<OrdersPage> {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        ...(query.search ? { search: query.search } : {}),
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        ...(query.status ? { status: query.status } : {}),
        ...(query.contragentId ? { contragentId: query.contragentId } : {}),
      })
      return authenticatedRequest(`/orders?${params.toString()}`)
    },

    detail(id: string): Promise<OrderDetail> {
      return authenticatedRequest(`/orders/${encodeURIComponent(id)}`)
    },

    creationOptions(): Promise<OrderCreationOptions> {
      return authenticatedRequest('/orders/creation-options')
    },

    create(input: CreateOrderInput): Promise<OrderDetail> {
      return authenticatedRequest('/orders', { method: 'POST', body: input })
    },
  }
}
