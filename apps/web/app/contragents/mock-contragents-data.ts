import type { AuthenticatedUser } from '@admin-panel/contracts'

import type {
  ContragentDirectoryPage,
  ContragentDirectoryQuery,
  ContragentKind,
  ContragentLookupItem,
} from './contragents-data'
import { ContragentsDataError } from './contragents-data'

interface ContragentRecord {
  readonly id: string
  readonly kind: ContragentKind
  readonly displayName: string
  readonly phone?: string
  readonly email?: string
  readonly companyName?: string
}

const records: readonly ContragentRecord[] = [
  { id: 'contragent-1', kind: 'company', displayName: 'Уралмашзавод', phone: '+7 343 111-22-33', email: 'info@uralmash.invalid' },
  { id: 'contragent-2', kind: 'company', displayName: 'Уралредуктор', phone: '+7 343 222-33-44', email: 'vtrpro@yandex.ru' },
  {
    id: 'contragent-3',
    kind: 'contact',
    displayName: 'Анна Соколова',
    phone: '+7 912 333-44-55',
    email: 'anna@uralreduktor.invalid',
    companyName: 'Уралредуктор',
  },
]

function validateQuery(query: ContragentDirectoryQuery): void {
  if (!Number.isInteger(query.page) || query.page < 1) throw new ContragentsDataError({ code: 'INVALID_CONTRAGENTS_QUERY', message: 'Номер страницы должен быть положительным целым числом.', requestId: 'mock-contragents' })
  if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100) throw new ContragentsDataError({ code: 'INVALID_CONTRAGENTS_QUERY', message: 'Размер страницы должен быть от 1 до 100.', requestId: 'mock-contragents' })
}

export function createMockContragentsData(_currentUser: () => AuthenticatedUser) {
  return {
    async lookup(kind?: ContragentKind): Promise<readonly ContragentLookupItem[]> {
      return records
        .filter(record => !kind || record.kind === kind)
        .map(record => ({
          id: record.id,
          label: record.displayName,
          kind: record.kind,
          ...(record.companyName ? { companyName: record.companyName } : {}),
        }))
    },

    async directory(query: ContragentDirectoryQuery): Promise<ContragentDirectoryPage> {
      validateQuery(query)
      const search = query.search?.trim().toLocaleLowerCase('ru-RU')
      const matching = records
        .filter(record => !query.kind || record.kind === query.kind)
        .filter(record => !search || [
          record.displayName,
          record.phone ?? '',
          record.email ?? '',
          record.companyName ?? '',
        ].some(value => value.toLocaleLowerCase('ru-RU').includes(search)))
      const start = (query.page - 1) * query.pageSize
      return {
        items: matching.slice(start, start + query.pageSize),
        page: query.page,
        pageSize: query.pageSize,
        total: matching.length,
      }
    },
  }
}
