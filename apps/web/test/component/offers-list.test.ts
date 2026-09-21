import type { OfferSummary, OffersPage, OffersQuery } from '@admin-panel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import OffersListView from '../../app/offers/OffersListView.vue'
import { formatRub } from '../../app/orders/order-presentation'
import type { OffersData } from '../../app/offers/offers-data'

const reducerOffer: OfferSummary = {
  id: 'offer-1',
  createdAt: '2026-07-02T10:00:00.000Z',
  number: 'OFF-2026-001',
  title: 'Предложение на редукторы',
  contragent: { id: 'contragent-2', label: 'Уралредуктор' },
  currency: 'RUB',
  ordersCount: 1,
  ordersTotalMinor: 30000000,
  organization: { id: 'organization-1', name: 'Моя компания' },
}

const logisticsOffer: OfferSummary = {
  id: 'offer-2',
  createdAt: '2026-07-10T14:30:00.000Z',
  number: 'OFF-2026-002',
  title: 'Предложение на логистику',
  currency: 'RUB',
  ordersCount: 0,
  ordersTotalMinor: 0,
  organization: { id: 'organization-1', name: 'Моя компания' },
}

const page: OffersPage = {
  items: [reducerOffer, logisticsOffer],
  page: 1,
  pageSize: 10,
  total: 2,
  filterOptions: { contragents: [{ id: 'contragent-2', label: 'Уралредуктор' }] },
}

describe('Offers list', () => {
  it('loads through the seam and renders identifying data with associated Order totals', async () => {
    const list = vi.fn<(query: OffersQuery) => Promise<OffersPage>>().mockResolvedValue(page)
    const data: OffersData = { list }
    const wrapper = mount(OffersListView, { props: { data } })

    expect(wrapper.get('[role="status"]').text()).toContain('Загружаем предложения')
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('02.07.2026')
    expect(rows[0]!.text()).toContain('OFF-2026-001')
    expect(rows[0]!.text()).toContain('Предложение на редукторы')
    expect(rows[0]!.text()).toContain('Уралредуктор')
    expect(rows[0]!.text()).toContain(formatRub(reducerOffer.ordersTotalMinor))
    expect(rows[1]!.text()).toContain('—')
    expect(wrapper.get('nav[aria-label="Пагинация предложений"]').text()).toContain('Страница 1 из 1')
  })

  it('sends server-shaped queries and reloads from the seam', async () => {
    const list = vi.fn<(query: OffersQuery) => Promise<OffersPage>>().mockResolvedValue(page)
    const data: OffersData = { list }
    const wrapper = mount(OffersListView, { props: { data } })
    await flushPromises()

    await wrapper.get('input[aria-label="Поиск предложений"]').setValue('редукторы')
    await wrapper.get('form[role="search"]').trigger('submit')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'редукторы' }))

    await wrapper.get('select[aria-label="Фильтр по контрагенту"]').setValue('contragent-2')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ contragentId: 'contragent-2', page: 1 }))

    await wrapper.get('select[aria-label="Сортировка предложений"]').setValue('number')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'number', sortDirection: 'asc' }))
  })

  it('shows an explicit empty state and a failure state with retry', async () => {
    const list = vi.fn<(query: OffersQuery) => Promise<OffersPage>>()
      .mockRejectedValueOnce(new Error('Сервис предложений временно недоступен.'))
      .mockResolvedValueOnce({ ...page, items: [], total: 0 })
    const data: OffersData = { list }
    const wrapper = mount(OffersListView, { props: { data } })

    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Сервис предложений временно недоступен')
    expect(wrapper.find('tbody').exists()).toBe(false)

    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe('Предложения не найдены')
  })
})
