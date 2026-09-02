import type { AuthenticatedUser, OrderDetail } from '@admin-panel/contracts'

import type { OrdersData } from './orders-data'

export interface CreateOrderOverlayPayload {
  readonly title: string
  readonly data: OrdersData
  readonly currentUser: AuthenticatedUser
  readonly onCreated: (order: OrderDetail) => void
  readonly onOfferHelp?: () => void
}

declare module '../overlays/overlay-lifecycle' {
  interface OverlayPayloads {
    readonly createOrder: CreateOrderOverlayPayload
  }
}
