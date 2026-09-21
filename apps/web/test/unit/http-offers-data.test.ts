import type { OffersPage } from '@admin-panel/contracts'
import { describe, expect, it, vi } from 'vitest'

import { createHttpOffersData } from '../../app/offers/http-offers-data'

const page = { items: [], page: 2, pageSize: 5, total: 0, filterOptions: { contragents: [] } } as OffersPage

describe('HTTP Offers data adapter', () => {
  it('implements the OffersData seam with bearer-authenticated versioned requests', async () => {
    const request = vi.fn().mockResolvedValueOnce(page)
    const data = createHttpOffersData({
      apiBase: 'http://api.example/api/v1/',
      accessToken: () => 'access-token',
      request,
    })

    await expect(data.list({
      page: 2,
      pageSize: 5,
      search: 'редукторы',
      sortBy: 'ordersTotalMinor',
      sortDirection: 'desc',
      contragentId: 'contragent-2',
    })).resolves.toBe(page)

    expect(request).toHaveBeenCalledWith(
      'http://api.example/api/v1/offers?page=2&pageSize=5&search=%D1%80%D0%B5%D0%B4%D1%83%D0%BA%D1%82%D0%BE%D1%80%D1%8B&sortBy=ordersTotalMinor&sortDirection=desc&contragentId=contragent-2',
      { headers: { Authorization: 'Bearer access-token' } },
    )
  })

  it('preserves structured backend errors and rejects calls without a session token', async () => {
    const request = vi.fn().mockRejectedValue({
      data: {
        code: 'INVALID_OFFERS_QUERY',
        message: 'Неподдерживаемое поле сортировки.',
        requestId: 'request-1',
      },
    })
    const data = createHttpOffersData({ apiBase: '/api/v1', accessToken: () => 'token', request })
    await expect(data.list({ page: 1, pageSize: 10, sortBy: 'createdAt', sortDirection: 'desc' }))
      .rejects.toMatchObject({
        name: 'OffersDataError',
        code: 'INVALID_OFFERS_QUERY',
        requestId: 'request-1',
      })

    const withoutToken = createHttpOffersData({ apiBase: '/api/v1', accessToken: () => null, request })
    await expect(withoutToken.list({ page: 1, pageSize: 10, sortBy: 'createdAt', sortDirection: 'desc' }))
      .rejects.toMatchObject({
        code: 'AUTH_REQUIRED',
        requestId: 'offers-http-auth',
      })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
