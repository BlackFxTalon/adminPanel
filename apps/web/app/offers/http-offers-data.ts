import type { OffersPage, OffersQuery, StructuredError } from '@admin-panel/contracts'

import type { OffersData } from './offers-data'
import { OffersDataError } from './offers-data'

interface HttpOffersDataOptions {
  readonly apiBase: string
  readonly accessToken: () => string | null
  readonly request: (url: string, options: { headers: Record<string, string> }) => Promise<unknown>
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

export function createHttpOffersData(options: HttpOffersDataOptions): OffersData {
  async function authenticatedRequest<T>(path: string): Promise<T> {
    const token = options.accessToken()
    if (!token) {
      throw new OffersDataError({
        code: 'AUTH_REQUIRED',
        message: 'Для работы с Offers требуется активная сессия.',
        requestId: 'offers-http-auth',
      })
    }
    try {
      return await options.request(`${normalizeBase(options.apiBase)}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      }) as T
    } catch (error: unknown) {
      if (error instanceof OffersDataError) throw error
      const body = isRecord(error) ? error.data : undefined
      if (isStructuredError(body)) throw new OffersDataError(body)
      throw new OffersDataError({
        code: 'OFFERS_REQUEST_FAILED',
        message: 'Не удалось загрузить Offers.',
        requestId: 'offers-http-request',
      })
    }
  }

  return {
    list(query: OffersQuery): Promise<OffersPage> {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        ...(query.search ? { search: query.search } : {}),
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        ...(query.contragentId ? { contragentId: query.contragentId } : {}),
      })
      return authenticatedRequest(`/offers?${params.toString()}`)
    },
  }
}
