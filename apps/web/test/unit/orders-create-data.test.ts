import type { AuthenticatedUser, CreateOrderInput } from '@admin-panel/contracts'
import { describe, expect, it } from 'vitest'

import { createMockOrdersData } from '../../app/orders/mock-orders-data'

const currentUser: AuthenticatedUser = {
  id: 'user-current',
  email: 'current@example.invalid',
  name: 'Текущий пользователь',
  role: 'user',
  organization: { id: 'organization-current', name: 'Текущая организация' },
}

const input: CreateOrderInput = {
  contragentId: 'contragent-2',
  offerId: 'offer-1',
  items: [{
    clientId: 'draft-item-1',
    name: 'Промышленный редуктор',
    quantity: 2,
    unitPriceMinor: 14500000,
    characteristics: 'Передаточное число 20:1',
    weightGrams: 125000,
    volumeCubicCentimeters: 24000,
  }],
}

describe('Orders create data seam', () => {
  it('returns an authoritative Order using current session context and computed RUB totals', async () => {
    const data = createMockOrdersData(() => currentUser)
    const options = await data.creationOptions()

    expect(options.contragents).toContainEqual({ id: 'contragent-2', label: 'Уралредуктор' })
    expect(options.offers).toContainEqual({ id: 'offer-1', label: 'Предложение на редукторы' })

    const created = await data.create(input)

    expect(created).toMatchObject({
      id: 'order-7',
      number: 'ORD-2026-007',
      createdAt: '2026-08-24T09:00:00.000Z',
      contragent: { id: 'contragent-2', label: 'Уралредуктор' },
      offer: { id: 'offer-1', label: 'Предложение на редукторы' },
      status: 'pending_approval',
      currency: 'RUB',
      totalMinor: 29000000,
      responsibleUser: { id: currentUser.id, name: currentUser.name },
      organization: currentUser.organization,
    })
    expect(created.items).toEqual([{
      id: 'order-7-item-1',
      name: 'Промышленный редуктор',
      quantity: 2,
      unitPriceMinor: 14500000,
      amountMinor: 29000000,
      characteristics: 'Передаточное число 20:1',
      weightGrams: 125000,
      volumeCubicCentimeters: 24000,
    }])

    const refreshed = await data.list({ page: 1, pageSize: 10, sortBy: 'createdAt', sortDirection: 'desc' })
    expect(refreshed.items[0]).toEqual(created)
    expect(refreshed.total).toBe(7)
  })

  it('rejects invalid fields with structured errors without changing Orders', async () => {
    const data = createMockOrdersData(() => currentUser)

    await expect(data.create({
      contragentId: '',
      items: [{
        clientId: 'draft-item-1',
        name: ' ',
        quantity: 0,
        unitPriceMinor: -1,
        weightGrams: -1,
        volumeCubicCentimeters: -1,
      }],
    })).rejects.toMatchObject({
      name: 'OrdersDataError',
      code: 'ORDER_VALIDATION_FAILED',
      requestId: 'mock-order-create',
      fieldErrors: {
        contragentId: ['Выберите контрагента.'],
        'items.0.name': ['Введите название позиции.'],
        'items.0.quantity': ['Количество должно быть положительным целым числом.'],
        'items.0.unitPriceMinor': ['Цена не может быть отрицательной.'],
        'items.0.weightGrams': ['Вес не может быть отрицательным.'],
        'items.0.volumeCubicCentimeters': ['Объём не может быть отрицательным.'],
      },
    })

    const unchanged = await data.list({ page: 1, pageSize: 10, sortBy: 'createdAt', sortDirection: 'desc' })
    expect(unchanged.total).toBe(6)
  })
})
