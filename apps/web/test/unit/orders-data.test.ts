import type { OrderStatus } from '@admin-panel/contracts'
import { describe, expect, it } from 'vitest'

import { createMockOrdersData } from '../../app/orders/mock-orders-data'
import type { OrdersDataError } from '../../app/orders/orders-data'

const currentUser = () => ({
  id: 'user-1',
  email: 'user@example.invalid',
  name: 'Анна Волкова',
  role: 'user' as const,
  organization: { id: 'organization-1', name: 'Моя компания' },
})

describe('Orders data seam', () => {
  it('returns deterministic paginated, searched, sorted and filtered Orders', async () => {
    const orders = createMockOrdersData(currentUser)

    const firstPage = await orders.list({ page: 1, pageSize: 2, sortBy: 'createdAt', sortDirection: 'desc' })
    expect(firstPage.total).toBe(6)
    expect(firstPage.items.map(order => order.number)).toEqual(['ORD-2026-006', 'ORD-2026-005'])
    expect(firstPage.items[0]).toMatchObject({
      contragent: { label: 'Уралмашзавод' },
      currency: 'RUB',
      organization: { name: 'Моя компания' },
      responsibleUser: { name: 'Анна Волкова' },
      status: 'awaiting_payment',
      totalMinor: 78000000,
    })

    const filtered = await orders.list({
      page: 1,
      pageSize: 10,
      search: 'редуктор',
      status: 'in_work',
      contragentId: 'contragent-2',
      sortBy: 'number',
      sortDirection: 'asc',
    })
    expect(filtered.items.map(order => order.number)).toEqual(['ORD-2026-002'])
    expect(filtered.filterOptions.contragents.map(contragent => contragent.label)).toEqual([
      'Уралмашзавод',
      'Уралредуктор',
      'ТрансЛогистика',
    ])
  })

  it('returns detail through the same seam and safely handles unsupported references and queries', async () => {
    const orders = createMockOrdersData(currentUser)

    const detail = await orders.detail('order-2')
    expect(detail.items.map(item => [item.name, item.amountMinor])).toEqual([
      ['Промышленный редуктор', 29000000],
      ['Муфта', 1000000],
    ])
    expect(detail.totalMinor).toBe(30000000)

    await expect(orders.list({
      page: 1,
      pageSize: 10,
      contragentId: 'unknown',
      sortBy: 'createdAt',
      sortDirection: 'desc',
    })).resolves.toMatchObject({ items: [], total: 0 })

    await expect(orders.list({
      page: 1,
      pageSize: 10,
      sortBy: 'unsupported' as 'createdAt',
      sortDirection: 'desc',
    })).rejects.toMatchObject<Partial<OrdersDataError>>({
      code: 'INVALID_ORDERS_QUERY',
      requestId: 'mock-orders-query',
    })

    await expect(orders.detail('missing')).rejects.toMatchObject<Partial<OrdersDataError>>({
      code: 'ORDER_NOT_FOUND',
      requestId: 'mock-order-detail',
    })
  })

  it('enforces every canonical status edge and protects final Orders', async () => {
    const validEdges: readonly [string, OrderStatus, OrderStatus][] = [
      ['order-1', 'pending_approval', 'in_work'],
      ['order-1', 'pending_approval', 'cancelled'],
      ['order-2', 'in_work', 'cargo_in_transit'],
      ['order-2', 'in_work', 'awaiting_payment'],
      ['order-2', 'in_work', 'cancelled'],
      ['order-3', 'cargo_in_transit', 'awaiting_payment'],
      ['order-6', 'awaiting_payment', 'completed'],
    ]

    for (const [id, currentStatus, nextStatus] of validEdges) {
      const orders = createMockOrdersData(currentUser)
      expect((await orders.detail(id)).status).toBe(currentStatus)
      await expect(orders.transitionStatus(id, nextStatus)).resolves.toMatchObject({ id, status: nextStatus })
      expect((await orders.detail(id)).status).toBe(nextStatus)
    }

    const orders = createMockOrdersData(currentUser)
    await expect(orders.transitionStatus('order-1', 'completed')).rejects.toMatchObject<Partial<OrdersDataError>>({
      code: 'INVALID_ORDER_STATUS_TRANSITION',
      requestId: 'mock-order-transition',
    })
    await expect(orders.transitionStatus('order-4', 'cancelled')).rejects.toMatchObject<Partial<OrdersDataError>>({
      code: 'INVALID_ORDER_STATUS_TRANSITION',
    })
    await expect(orders.transitionStatus('order-5', 'in_work')).rejects.toMatchObject<Partial<OrdersDataError>>({
      code: 'INVALID_ORDER_STATUS_TRANSITION',
    })
  })
})
