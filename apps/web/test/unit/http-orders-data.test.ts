import type { OrderDetail, OrdersPage } from '@admin-panel/contracts'
import { describe, expect, it, vi } from 'vitest'

import { createHttpOrdersData } from '../../app/orders/http-orders-data'

const order = { id: 'order-1' } as OrderDetail
const page = { items: [order], page: 2, pageSize: 5, total: 1, filterOptions: { contragents: [] } } as OrdersPage

describe('HTTP Orders data adapter', () => {
  it('implements the existing OrdersData seam with bearer-authenticated versioned requests', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(page)
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({ contragents: [], offers: [] })
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({ ...order, status: 'in_work' })
    const data = createHttpOrdersData({
      apiBase: 'http://api.example/api/v1/',
      accessToken: () => 'access-token',
      request,
    })

    await expect(data.list({
      page: 2,
      pageSize: 5,
      search: 'редуктор',
      status: 'in_work',
      contragentId: 'contragent-1',
      sortBy: 'number',
      sortDirection: 'asc',
    })).resolves.toBe(page)
    await expect(data.detail('order/1')).resolves.toBe(order)
    await expect(data.creationOptions()).resolves.toEqual({ contragents: [], offers: [] })
    await expect(data.create({
      contragentId: 'contragent-1',
      items: [{ clientId: 'item-1', name: 'Муфта', quantity: 2, unitPriceMinor: 100 }],
    })).resolves.toBe(order)
    await expect(data.transitionStatus('order/1', 'in_work')).resolves.toMatchObject({ status: 'in_work' })

    expect(request).toHaveBeenNthCalledWith(1,
      'http://api.example/api/v1/orders?page=2&pageSize=5&search=%D1%80%D0%B5%D0%B4%D1%83%D0%BA%D1%82%D0%BE%D1%80&sortBy=number&sortDirection=asc&status=in_work&contragentId=contragent-1',
      { headers: { Authorization: 'Bearer access-token' } },
    )
    expect(request).toHaveBeenNthCalledWith(2, 'http://api.example/api/v1/orders/order%2F1', {
      headers: { Authorization: 'Bearer access-token' },
    })
    expect(request).toHaveBeenNthCalledWith(3, 'http://api.example/api/v1/orders/creation-options', {
      headers: { Authorization: 'Bearer access-token' },
    })
    expect(request).toHaveBeenNthCalledWith(4, 'http://api.example/api/v1/orders', {
      method: 'POST',
      body: {
        contragentId: 'contragent-1',
        items: [{ clientId: 'item-1', name: 'Муфта', quantity: 2, unitPriceMinor: 100 }],
      },
      headers: { Authorization: 'Bearer access-token' },
    })
    expect(request).toHaveBeenNthCalledWith(5, 'http://api.example/api/v1/orders/order%2F1/status', {
      method: 'PATCH',
      body: { status: 'in_work' },
      headers: { Authorization: 'Bearer access-token' },
    })
  })

  it('preserves structured backend errors and rejects calls without a session token', async () => {
    const request = vi.fn().mockRejectedValue({
      data: {
        code: 'ORDER_VALIDATION_FAILED',
        message: 'Исправьте ошибки в форме.',
        requestId: 'request-1',
        fieldErrors: { contragentId: ['Выберите контрагента.'] },
      },
    })
    const data = createHttpOrdersData({ apiBase: '/api/v1', accessToken: () => 'token', request })
    await expect(data.create({ contragentId: '', items: [] as never })).rejects.toMatchObject({
      name: 'OrdersDataError',
      code: 'ORDER_VALIDATION_FAILED',
      requestId: 'request-1',
      fieldErrors: { contragentId: ['Выберите контрагента.'] },
    })

    const withoutToken = createHttpOrdersData({ apiBase: '/api/v1', accessToken: () => null, request })
    await expect(withoutToken.creationOptions()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      requestId: 'orders-http-auth',
    })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
