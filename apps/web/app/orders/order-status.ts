import type { OrderStatus } from '@admin-panel/contracts'

export const orderStatusLabels: Readonly<Record<OrderStatus, string>> = {
  pending_approval: 'Ожидает согласования',
  in_work: 'В работе',
  cargo_in_transit: 'Груз в пути',
  awaiting_payment: 'Ожидает оплаты',
  completed: 'Завершён',
  cancelled: 'Отменён',
}

export function isOrderStatus(value: string): value is OrderStatus {
  return Object.prototype.hasOwnProperty.call(orderStatusLabels, value)
}
