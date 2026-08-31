import type { Organization } from './index.js'

export const orderStatuses = [
  'pending_approval',
  'in_work',
  'cargo_in_transit',
  'awaiting_payment',
  'completed',
  'cancelled',
] as const

export type OrderStatus = typeof orderStatuses[number]

export type OrderSortField = 'createdAt' | 'number' | 'totalMinor'
export type SortDirection = 'asc' | 'desc'

export interface OrderReference {
  readonly id: string
  readonly label: string
}

export interface OrderUserReference {
  readonly id: string
  readonly name: string
}

export interface OrderItem {
  readonly id: string
  readonly name: string
  readonly quantity: number
  readonly unitPriceMinor: number
  readonly amountMinor: number
}

export type OrderItems = readonly [OrderItem, ...OrderItem[]]

export interface OrderSummary {
  readonly id: string
  readonly createdAt: string
  readonly number: string
  readonly contragent: OrderReference
  readonly totalMinor: number
  readonly currency: 'RUB'
  readonly status: OrderStatus
  readonly responsibleUser: OrderUserReference
  readonly organization: Organization
}

export interface OrderDetail extends OrderSummary {
  readonly items: OrderItems
}

export interface OrdersQuery {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sortBy: OrderSortField
  readonly sortDirection: SortDirection
  readonly status?: OrderStatus
  readonly contragentId?: string
}

export interface OrdersPage {
  readonly items: readonly OrderSummary[]
  readonly page: number
  readonly pageSize: number
  readonly total: number
  readonly filterOptions: {
    readonly contragents: readonly OrderReference[]
  }
}

export interface StructuredError {
  readonly code: string
  readonly message: string
  readonly requestId: string
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>
}
