import type { OrderDetail, OrdersPage, OrdersQuery } from '@admin-panel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import OrderDetailView from '../../app/orders/OrderDetailView.vue'
import type { OrdersData } from '../../app/orders/orders-data'

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
