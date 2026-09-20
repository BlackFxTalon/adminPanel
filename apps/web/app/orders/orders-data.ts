import type {
  CreateOrderInput,
  OrderCreationOptions,
  OrderDetail,
  OrderStatus,
  OrdersPage,
  OrdersQuery,
  StructuredError,
} from '@admin-panel/contracts'

export interface OrdersData {
  list(query: OrdersQuery): Promise<OrdersPage>
  detail(id: string): Promise<OrderDetail>
  creationOptions(): Promise<OrderCreationOptions>
  create(input: CreateOrderInput): Promise<OrderDetail>
  transitionStatus(id: string, status: OrderStatus): Promise<OrderDetail>
}

export class OrdersDataError extends Error implements StructuredError {
  readonly code: string
  readonly requestId: string
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>

  constructor(error: StructuredError) {
    super(error.message)
    this.name = 'OrdersDataError'
    this.code = error.code
    this.requestId = error.requestId
    this.fieldErrors = error.fieldErrors
  }
}
