import type { AuthenticatedUser, OrderSummary, SortDirection } from '@admin-panel/contracts'
import { describe, expect, it } from 'vitest'

import { createMockOrdersData } from '../../app/orders/mock-orders-data'
import { createMockOffersData } from '../../app/offers/mock-offers-data'
import type { OffersDataError } from '../../app/offers/offers-data'

const currentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@example.invalid',
  name: 'Анна Волкова',
  role: 'user',
  organization: { id: 'organization-1', name: 'Моя компания' },
}

async function associatedOrderTotals(offerId: string): Promise<{ count: number, totalMinor: number }> {
  const orders = createMockOrdersData(() => currentUser)
  const page = await orders.list({ page: 1, pageSize: 100, sortBy: 'createdAt', sortDirection: 'desc' })
  return page.items
    .filter((order: OrderSummary) => order.offer?.id === offerId)
    .reduce((totals, order) => ({ count: totals.count + 1, totalMinor: totals.totalMinor + order.totalMinor }), { count: 0, totalMinor: 0 })
}

describe('Offers data seam', () => {
  it('returns deterministic paginated Offers with associated Order totals', async () => {
    const offers = createMockOffersData(() => currentUser)

    const firstPage = await offers.list({ page: 1, pageSize: 1, sortBy: 'createdAt', sortDirection: 'desc' })
    expect(firstPage.total).toBe(2)
    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.items[0]).toMatchObject({
      id: 'offer-2',
      number: 'OFF-2026-002',
      title: 'Предложение на логистику',
      currency: 'RUB',
      ordersCount: 0,
      ordersTotalMinor: 0,
    })
    expect(firstPage.items[0]?.contragent).toBeUndefined()

    const secondPage = await offers.list({ page: 2, pageSize: 1, sortBy: 'createdAt', sortDirection: 'desc' })
    expect(secondPage.items[0]).toMatchObject({
      id: 'offer-1',
      number: 'OFF-2026-001',
      title: 'Предложение на редукторы',
      contragent: { id: 'contragent-2', label: 'Уралредуктор' },
    })
    expect(secondPage.filterOptions.contragents).toContainEqual({ id: 'contragent-2', label: 'Уралредуктор' })
  })

  it('computes Offer totals from associated Orders in the same identity space', async () => {
    const offers = createMockOffersData(() => currentUser)

    const page = await offers.list({ page: 1, pageSize: 10, sortBy: 'ordersTotalMinor', sortDirection: 'desc' })
    const reducerOffer = page.items.find(offer => offer.id === 'offer-1')
    expect(reducerOffer?.ordersCount).toBe(await associatedOrderTotals('offer-1').then(totals => totals.count))
    expect(reducerOffer?.ordersTotalMinor).toBe(await associatedOrderTotals('offer-1').then(totals => totals.totalMinor))
    expect(reducerOffer?.ordersCount).toBeGreaterThan(0)
    expect(reducerOffer?.ordersTotalMinor).toBeGreaterThan(0)
  })

  it('searches, filters and validates Offers queries', async () => {
    const offers = createMockOffersData(() => currentUser)

    const searched = await offers.list({ page: 1, pageSize: 10, search: 'редукторы', sortBy: 'createdAt', sortDirection: 'desc' })
    expect(searched.items.map(offer => offer.number)).toEqual(['OFF-2026-001'])

    const searchedByContragent = await offers.list({ page: 1, pageSize: 10, search: 'уралредуктор', sortBy: 'createdAt', sortDirection: 'desc' })
    expect(searchedByContragent.items.map(offer => offer.number)).toEqual(['OFF-2026-001'])

    const filtered = await offers.list({
      page: 1,
      pageSize: 10,
      contragentId: 'contragent-2',
      sortBy: 'number',
      sortDirection: 'asc',
    })
    expect(filtered.items.map(offer => offer.number)).toEqual(['OFF-2026-001'])

    const unattached = await offers.list({
      page: 1,
      pageSize: 10,
      contragentId: 'unknown',
      sortBy: 'createdAt',
      sortDirection: 'desc',
    })
    expect(unattached.items).toEqual([])
    expect(unattached.total).toBe(0)

    await expect(offers.list({ page: 0, pageSize: 10, sortBy: 'createdAt', sortDirection: 'desc' }))
      .rejects.toMatchObject<Partial<OffersDataError>>({ code: 'INVALID_OFFERS_QUERY', requestId: 'mock-offers-query' })
    await expect(offers.list({ page: 1, pageSize: 101, sortBy: 'createdAt', sortDirection: 'desc' }))
      .rejects.toMatchObject<Partial<OffersDataError>>({ code: 'INVALID_OFFERS_QUERY' })
    await expect(offers.list({ page: 1, pageSize: 10, sortBy: 'unsupported' as 'createdAt', sortDirection: 'asc' as SortDirection }))
      .rejects.toMatchObject<Partial<OffersDataError>>({ code: 'INVALID_OFFERS_QUERY' })
  })
})
