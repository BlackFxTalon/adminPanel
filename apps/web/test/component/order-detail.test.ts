import type { OrderDetail, OrderStatus, OrdersPage, OrdersQuery } from '@admin-panel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import OrderDetailView from '../../app/orders/OrderDetailView.vue'
import { orderStatusLabels } from '../../app/orders/order-presentation'
import type { OrdersData } from '../../app/orders/orders-data'
import { OrdersDataError } from '../../app/orders/orders-data'

const detail: OrderDetail = {
  id: 'order-2',
  createdAt: '2026-08-04T12:00:00.000Z',
  number: 'ORD-2026-002',
  contragent: { id: 'contragent-2', label: 'Уралредуктор' },
  totalMinor: 30000000,
  currency: 'RUB',
  status: 'in_work',
  responsibleUser: { id: 'user-1', name: 'Анна Волкова' },
  organization: { id: 'organization-1', name: 'Моя компания' },
  items: [
    { id: 'item-2', name: 'Промышленный редуктор', quantity: 2, unitPriceMinor: 14500000, amountMinor: 29000000 },
    { id: 'item-3', name: 'Муфта', quantity: 4, unitPriceMinor: 250000, amountMinor: 1000000 },
  ],
}

describe('Order detail', () => {
  it('loads through the seam and displays returned Order items and totals', async () => {
    const data: OrdersData = {
      list: vi.fn<(query: OrdersQuery) => Promise<OrdersPage>>(),
      detail: vi.fn().mockResolvedValue(detail),
    }
    const wrapper = mount(OrderDetailView, {
      props: { data, orderId: 'order-2' },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

    expect(wrapper.get('[role="status"]').text()).toContain('Загружаем заказ')
    await flushPromises()

    expect(data.detail).toHaveBeenCalledWith('order-2')
    expect(wrapper.get('h1').text()).toBe('Заказ ORD-2026-002')
    expect(wrapper.text()).toContain('Уралредуктор')
    expect(wrapper.text()).toContain('В работе')
    expect(wrapper.text()).toContain('Промышленный редуктор')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('145 000,00 ₽')
    expect(wrapper.text()).toContain('290 000,00 ₽')
    expect(wrapper.get('[data-testid="order-total"]').text()).toContain('300 000,00 ₽')
    expect(wrapper.get('a').attributes('href')).toBe('/orders')
  })

  it('offers only valid Russian-labelled transitions and accepts the authoritative response', async () => {
    const transitionStatus = vi.fn().mockResolvedValue({ ...detail, status: 'awaiting_payment' })
    const data = {
      detail: vi.fn().mockResolvedValue(detail),
      transitionStatus,
    } as unknown as OrdersData
    const wrapper = mount(OrderDetailView, {
      props: { data, orderId: detail.id },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })
    await flushPromises()

    const actions = wrapper.get('[data-testid="order-status-actions"]')
    expect(actions.text()).toContain('Груз в пути')
    expect(actions.text()).toContain('Ожидает оплаты')
    expect(actions.text()).toContain('Отменён')
    expect(actions.text()).not.toContain('Ожидает согласования')
    expect(actions.text()).not.toContain('Завершён')

    await actions.get('button[data-status="awaiting_payment"]').trigger('click')
    await flushPromises()

    expect(transitionStatus).toHaveBeenCalledWith(detail.id, 'awaiting_payment')
    expect(wrapper.get('.order-detail__status').text()).toBe('Ожидает оплаты')
    expect(wrapper.get('[data-testid="order-status-actions"]').text()).toContain('Завершён')
    expect(wrapper.get('[data-testid="order-status-actions"]').findAll('button')).toHaveLength(1)
  })

  it('keeps the current status after transition failure and hides editing actions for final Orders', async () => {
    const transitionStatus = vi.fn().mockRejectedValue(new OrdersDataError({
      code: 'INVALID_ORDER_STATUS_TRANSITION',
      message: 'Недопустимый переход статуса Order.',
      requestId: 'request-1',
    }))
    const data = {
      detail: vi.fn().mockResolvedValue(detail),
      transitionStatus,
    } as unknown as OrdersData
    const wrapper = mount(OrderDetailView, {
      props: { data, orderId: detail.id },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })
    await flushPromises()

    await wrapper.get('button[data-status="cargo_in_transit"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.order-detail__status').text()).toBe('В работе')
    expect(wrapper.get('[data-testid="order-transition-error"]').text()).toContain('Недопустимый переход')

    await wrapper.setProps({ data: { ...data, detail: vi.fn().mockResolvedValue({ ...detail, id: 'final', status: 'completed' }) }, orderId: 'final' })
    await flushPromises()
    expect(wrapper.find('[data-testid="order-status-actions"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="order-final-notice"]').text()).toContain('нельзя редактировать')

    await wrapper.setProps({ data: { ...data, detail: vi.fn().mockResolvedValue({ ...detail, id: 'cancelled', status: 'cancelled' }) }, orderId: 'cancelled' })
    await flushPromises()
    expect(wrapper.find('[data-testid="order-status-actions"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="order-final-notice"]').text()).toContain('нельзя редактировать')
  })

  it('does not let a pending transition overwrite a newer A-B-A route load', async () => {
    let resolveTransition!: (value: OrderDetail) => void
    const transition = new Promise<OrderDetail>(resolve => { resolveTransition = resolve })
    const nextOrder = { ...detail, id: 'order-new', number: 'ORD-NEW', status: 'pending_approval' as const }
    const data = {
      detail: vi.fn()
        .mockResolvedValueOnce(detail)
        .mockResolvedValueOnce(nextOrder)
        .mockResolvedValueOnce(detail),
      transitionStatus: vi.fn().mockReturnValue(transition),
    } as unknown as OrdersData
    const wrapper = mount(OrderDetailView, {
      props: { data, orderId: detail.id },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })
    await flushPromises()

    await wrapper.get('button[data-status="cargo_in_transit"]').trigger('click')
    await wrapper.setProps({ orderId: nextOrder.id })
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Заказ ORD-NEW')

    await wrapper.setProps({ orderId: detail.id })
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Заказ ORD-2026-002')
    expect(wrapper.get('.order-detail__status').text()).toBe('В работе')

    resolveTransition({ ...detail, status: 'cargo_in_transit' })
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Заказ ORD-2026-002')
    expect(wrapper.get('.order-detail__status').text()).toBe('В работе')
  })

  it('offers and performs every valid status edge with Russian labels', async () => {
    const validEdges: readonly [OrderStatus, OrderStatus][] = [
      ['pending_approval', 'in_work'],
      ['pending_approval', 'cancelled'],
      ['in_work', 'cargo_in_transit'],
      ['in_work', 'awaiting_payment'],
      ['in_work', 'cancelled'],
      ['cargo_in_transit', 'awaiting_payment'],
      ['awaiting_payment', 'completed'],
    ]

    for (const [from, to] of validEdges) {
      const order: OrderDetail = { ...detail, id: 'edge-order', number: 'ORD-EDGE', status: from }
      const transitionStatus = vi.fn().mockResolvedValue({ ...order, status: to })
      const data = {
        detail: vi.fn().mockResolvedValue(order),
        transitionStatus,
      } as unknown as OrdersData
      const wrapper = mount(OrderDetailView, {
        props: { data, orderId: order.id },
        global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
      })
      await flushPromises()

      const actions = wrapper.get('[data-testid="order-status-actions"]')
      expect(actions.get(`button[data-status="${to}"]`).text()).toBe(orderStatusLabels[to])
      await actions.get(`button[data-status="${to}"]`).trigger('click')
      await flushPromises()

      expect(transitionStatus).toHaveBeenCalledWith(order.id, to)
      expect(wrapper.get('.order-detail__status').text()).toBe(orderStatusLabels[to])
      wrapper.unmount()
    }
  })

  it('keeps the newest Order when route requests resolve out of order', async () => {
    const pending = new Map<string, (value: OrderDetail) => void>()
    const data: OrdersData = {
      list: vi.fn<(query: OrdersQuery) => Promise<OrdersPage>>(),
      detail: vi.fn((id: string) => new Promise(resolve => pending.set(id, resolve))),
    }
    const wrapper = mount(OrderDetailView, {
      props: { data, orderId: 'order-old' },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

    await wrapper.setProps({ orderId: 'order-new' })
    pending.get('order-new')!({ ...detail, id: 'order-new', number: 'ORD-NEW' })
    await flushPromises()
    pending.get('order-old')!({ ...detail, id: 'order-old', number: 'ORD-OLD' })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Заказ ORD-NEW')
  })
})
