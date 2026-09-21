import type {
  OffersPage,
  OffersQuery,
  StructuredError,
} from '@admin-panel/contracts'

export interface OffersData {
  list(query: OffersQuery): Promise<OffersPage>
}

export class OffersDataError extends Error implements StructuredError {
  readonly code: string
  readonly requestId: string

  constructor(error: StructuredError) {
    super(error.message)
    this.name = 'OffersDataError'
    this.code = error.code
    this.requestId = error.requestId
  }
}
