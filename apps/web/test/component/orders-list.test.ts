import type { OrderDetail, OrdersPage, OrdersQuery } from '@admin-panel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import OrdersListView from '../../app/orders/OrdersListView.vue'
import type { OrdersData } from '../../app/orders/orders-data'

const page: OrdersPage = {
  items: [{
    id: 'order-6',
    createdAt: '2026-08-20T11:20:00.000Z',
    number: 'ORD-2026-006',
    contragent: { id: 'contragent-1', label: 'Уралмашзавод' },
    totalMinor: 78000000,
    currency: 'RUB',
    status: 'awaiting_payment',
    responsibleUser: { id: 'user-1', name: 'Анна Волкова' },
    organization: { id: 'organization-1', name: 'Моя компания' },
  }],
  page: 1,
  pageSize: 10,
  total: 11,
  filterOptions: { contragents: [{ id: 'contragent-1', label: 'Уралмашзавод' }] },
}

function pageWithNumber(number: string): OrdersPage {
  return {
    ...page,
    items: [{ ...page.items[0]!, number }],
  }
}

describe('Orders list', () => {
  it('loads through the seam, renders identifying data and sends server-shaped queries', async () => {
    let resolveList!: (value: OrdersPage) => void
    const firstList = new Promise<OrdersPage>(resolve => { resolveList = resolve })
    const list = vi.fn<(query: OrdersQuery) => Promise<OrdersPage>>()
      .mockReturnValueOnce(firstList)
      .mockResolvedValue(page)
    const data: OrdersData = {
      list,
      detail: vi.fn<(id: string) => Promise<OrderDetail>>(),
    }
    const wrapper = mount(OrdersListView, {
      props: { data },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

    expect(wrapper.get('[role="status"]').text()).toContain('Загружаем заказы')
    resolveList(page)
    await flushPromises()

    const row = wrapper.get('tbody tr')
    expect(row.text()).toContain('20.08.2026')
    expect(row.text()).toContain('ORD-2026-006')
    expect(row.text()).toContain('Уралмашзавод')
    expect(row.text()).toContain('780 000,00 ₽')
    expect(row.text()).toContain('Ожидает оплаты')
    expect(row.text()).toContain('Анна Волкова')
    expect(row.text()).toContain('Моя компания')
    expect(row.get('a').attributes('href')).toBe('/orders/order-6')

    await wrapper.get('input[aria-label="Поиск заказов"]').setValue('насос')
    await wrapper.get('form[role="search"]').trigger('submit')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({
      page: 1,
      search: 'насос',
      sortBy: 'createdAt',
      sortDirection: 'desc',
    }))

    await wrapper.get('select[aria-label="Фильтр по статусу"]').setValue('awaiting_payment')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'awaiting_payment' }))

    await wrapper.get('select[aria-label="Фильтр по контрагенту"]').setValue('contragent-1')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ contragentId: 'contragent-1' }))

    await wrapper.get('select[aria-label="Сортировка заказов"]').setValue('number')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'number', sortDirection: 'asc' }))

    await wrapper.get('nav[aria-label="Пагинация заказов"] button:last-child').trigger('click')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
  })

  it('replaces stale data with a useful failure state and retries through the seam', async () => {
    const list = vi.fn<(query: OrdersQuery) => Promise<OrdersPage>>()
      .mockRejectedValueOnce(new Error('Сервис заказов временно недоступен.'))
      .mockResolvedValueOnce(page)
    const data: OrdersData = {
      list,
      detail: vi.fn<(id: string) => Promise<OrderDetail>>(),
    }
    const wrapper = mount(OrdersListView, {
      props: { data },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })

    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Сервис заказов временно недоступен')
    expect(wrapper.find('tbody').exists()).toBe(false)

    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('tbody').text()).toContain('ORD-2026-006')
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('shows an explicit empty state', async () => {
    const data: OrdersData = {
      list: vi.fn().mockResolvedValue({
        items: [],
        page: 1,
        pageSize: 10,
        total: 0,
        filterOptions: { contragents: [] },
      }),
      detail: vi.fn<(id: string) => Promise<OrderDetail>>(),
    }
    const wrapper = mount(OrdersListView, { props: { data } })

    await flushPromises()
    expect(wrapper.get('h2').text()).toBe('Заказы не найдены')
    expect(wrapper.find('tbody').exists()).toBe(false)
  })

  it('keeps the newest query result when requests resolve out of order', async () => {
    const pending = new Map<string, (value: OrdersPage) => void>()
    const data: OrdersData = {
      list: vi.fn((query: OrdersQuery) => {
        if (!query.search) return Promise.resolve(page)
        return new Promise(resolve => pending.set(query.search!, resolve))
      }),
      detail: vi.fn<(id: string) => Promise<OrderDetail>>(),
    }
    const wrapper = mount(OrdersListView, {
      props: { data },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })
    await flushPromises()

    const search = wrapper.get('input[aria-label="Поиск заказов"]')
    await search.setValue('старый')
    await wrapper.get('form[role="search"]').trigger('submit')
    await search.setValue('новый')
    await wrapper.get('form[role="search"]').trigger('submit')

    pending.get('новый')!(pageWithNumber('ORD-NEW'))
    await flushPromises()
    pending.get('старый')!(pageWithNumber('ORD-OLD'))
    await flushPromises()

    expect(wrapper.get('tbody').text()).toContain('ORD-NEW')
    expect(wrapper.get('tbody').text()).not.toContain('ORD-OLD')
  })
})
