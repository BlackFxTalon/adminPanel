import type { OrderReference, Organization, SortDirection } from './index.js'

export type OfferSortField = 'createdAt' | 'number' | 'ordersTotalMinor'

export interface OfferSummary {
  readonly id: string
  readonly createdAt: string
  readonly number: string
  readonly title: string
  readonly contragent?: OrderReference
  readonly currency: 'RUB'
  readonly ordersCount: number
  readonly ordersTotalMinor: number
  readonly organization: Organization
}

export interface OffersQuery {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sortBy: OfferSortField
  readonly sortDirection: SortDirection
  readonly contragentId?: string
}

export interface OffersPage {
  readonly items: readonly OfferSummary[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
  readonly filterOptions: {
    readonly contragents: readonly OrderReference[]
  }
}
