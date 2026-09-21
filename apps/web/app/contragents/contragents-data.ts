import type { StructuredError } from '@admin-panel/contracts'

export type ContragentKind = 'company' | 'contact'

export interface ContragentLookupItem {
  readonly id: string
  readonly label: string
  readonly kind: ContragentKind
  readonly companyName?: string
}

export interface ContragentDirectoryQuery {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly kind?: ContragentKind
}

export interface ContragentDirectoryEntry {
  readonly id: string
  readonly kind: ContragentKind
  readonly displayName: string
  readonly phone?: string
  readonly email?: string
  readonly companyName?: string
}

export interface ContragentDirectoryPage {
  readonly items: readonly ContragentDirectoryEntry[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
}

export interface ContragentsData {
  lookup(kind?: ContragentKind): Promise<readonly ContragentLookupItem[]>
  directory(query: ContragentDirectoryQuery): Promise<ContragentDirectoryPage>
}

export class ContragentsDataError extends Error implements StructuredError {
  readonly code: string
  readonly requestId: string

  constructor(error: StructuredError) {
    super(error.message)
    this.name = 'ContragentsDataError'
    this.code = error.code
    this.requestId = error.requestId
  }
}
