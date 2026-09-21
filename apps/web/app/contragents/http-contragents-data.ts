import type {
  ContragentDirectoryPage,
  ContragentDirectoryQuery,
  ContragentKind,
  ContragentLookupItem,
} from './contragents-data'
import { ContragentsDataError } from './contragents-data'

interface HttpContragentsDataOptions {
  readonly apiBase: string
  readonly accessToken: () => string | null
  readonly request: (url: string, options: { headers: Record<string, string> }) => Promise<unknown>
}

function normalizeBase(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function authenticatedRequest<T>(options: HttpContragentsDataOptions, path: string): Promise<T> {
  const token = options.accessToken()
  if (!token) {
    return Promise.reject(new ContragentsDataError({
      code: 'AUTH_REQUIRED',
      message: 'Для работы с Contragents требуется активная сессия.',
      requestId: 'contragents-http-auth',
    }))
  }
  return options.request(`${normalizeBase(options.apiBase)}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {
    throw new ContragentsDataError({
      code: 'CONTRAGENTS_REQUEST_FAILED',
      message: 'Не удалось загрузить Contragents.',
      requestId: 'contragents-http-request',
    })
  }) as Promise<T>
}

export function createHttpContragentsData(options: HttpContragentsDataOptions) {
  return {
    lookup(kind?: ContragentKind): Promise<readonly ContragentLookupItem[]> {
      const query = kind ? `?kind=${encodeURIComponent(kind)}` : ''
      return authenticatedRequest(options, `/contragents/lookup${query}`)
    },

    directory(query: ContragentDirectoryQuery): Promise<ContragentDirectoryPage> {
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        ...(query.search ? { search: query.search } : {}),
        ...(query.kind ? { kind: query.kind } : {}),
      })
      return authenticatedRequest(options, `/contragents?${params.toString()}`)
    },
  }
}
