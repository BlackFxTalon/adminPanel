import type {
  AuthenticatedUser,
  CreateOrderInput,
  OrderCreationOptions,
  OrderDetail,
  OrdersPage,
  OrdersQuery,
} from '@admin-panel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import CreateOrderOverlay from '../../app/orders/CreateOrderOverlay.vue'
import { OrdersDataError, type OrdersData } from '../../app/orders/orders-data'

const currentUser: AuthenticatedUser = {
  id: 'user-current',
  email: 'current@example.invalid',
  name: 'Текущий пользователь',
  role: 'user',
  organization: { id: 'organization-current', name: 'Текущая организация' },
}

const options: OrderCreationOptions = {
  contragents: [{ id: 'contragent-2', label: 'Уралредуктор' }],
  offers: [{ id: 'offer-1', label: 'Предложение на редукторы' }],
}

const created: OrderDetail = {
  id: 'order-7',
  createdAt: '2026-08-24T09:00:00.000Z',
  number: 'ORD-2026-007',
  contragent: options.contragents[0]!,
  offer: options.offers[0],
  totalMinor: 29000000,
  currency: 'RUB',
  status: 'pending_approval',
  responsibleUser: { id: currentUser.id, name: currentUser.name },
  organization: currentUser.organization,
  items: [{ id: 'order-7-item-1', name: 'Редуктор', quantity: 2, unitPriceMinor: 14500000, amountMinor: 29000000 }],
}

function createData(create = vi.fn<(input: CreateOrderInput) => Promise<OrderDetail>>().mockResolvedValue(created)): OrdersData {
  return {
    list: vi.fn<(query: OrdersQuery) => Promise<OrdersPage>>(),
    detail: vi.fn<(id: string) => Promise<OrderDetail>>(),
    creationOptions: vi.fn().mockResolvedValue(options),
    create,
  }
}

describe('Create Order Overlay', () => {
  it('shows session defaults, previews authoritative RUB inputs and returns the created Order', async () => {
    const data = createData()
    const onCreated = vi.fn()
    const wrapper = mount(CreateOrderOverlay, {
      props: {
        headingId: 'create-order-heading',
        payload: { data, currentUser, onCreated, title: 'Новый заказ' },
      },
    })
    await flushPromises()

    expect(wrapper.get('h2').text()).toBe('Новый заказ')
    expect(wrapper.text()).toContain('Текущая организация')
    expect(wrapper.text()).toContain('Текущий пользователь')

    await wrapper.get('select[aria-label="Контрагент"]').setValue('contragent-2')
    await wrapper.get('select[aria-label="Предложение"]').setValue('offer-1')
    await wrapper.get('input[aria-label="Название позиции 1"]').setValue('Редуктор')
    await wrapper.get('input[aria-label="Количество позиции 1"]').setValue('2')
    await wrapper.get('input[aria-label="Цена позиции 1, ₽"]').setValue('145000')

    expect(wrapper.get('[data-testid="order-item-amount-1"]').text()).toContain('290 000,00 ₽')
    expect(wrapper.get('[data-testid="order-create-total"]').text()).toContain('290 000,00 ₽')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(data.create).toHaveBeenCalledWith({
      contragentId: 'contragent-2',
      offerId: 'offer-1',
      items: [{
        clientId: 'draft-item-1',
        name: 'Редуктор',
        quantity: 2,
        unitPriceMinor: 14500000,
      }],
    })
    expect(onCreated).toHaveBeenCalledWith(created)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('shows immediate field errors and keeps deterministic item identity while adding and removing', async () => {
    const data = createData()
    const wrapper = mount(CreateOrderOverlay, {
      props: {
        headingId: 'create-order-heading',
        payload: { data, currentUser, onCreated: vi.fn(), title: 'Новый заказ' },
      },
    })
    await flushPromises()

    await wrapper.get('form').trigger('submit')

    expect(data.create).not.toHaveBeenCalled()
    expect(wrapper.get('select[aria-label="Контрагент"]').attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('Выберите контрагента.')
    expect(wrapper.get('input[aria-label="Название позиции 1"]').attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('Введите название позиции.')

    await wrapper.get('button[aria-label="Добавить позицию"]').trigger('click')
    expect(wrapper.findAll('fieldset')).toHaveLength(2)
    await wrapper.get('input[aria-label="Название позиции 2"]').setValue('Муфта')
    await wrapper.get('button[aria-label="Удалить позицию 1"]').trigger('click')

    expect(wrapper.findAll('fieldset')).toHaveLength(1)
    expect(wrapper.get('input[aria-label="Название позиции 1"]').element.value).toBe('Муфта')
    expect(wrapper.emitted('dirtyChange')?.some(args => args[0] === true)).toBe(true)
  })

  it('preserves entered values and exposes structured save errors for retry', async () => {
    const create = vi.fn<(input: CreateOrderInput) => Promise<OrderDetail>>()
      .mockRejectedValueOnce(new OrdersDataError({
        code: 'ORDER_VALIDATION_FAILED',
        message: 'Проверьте позицию.',
        requestId: 'request-1',
        fieldErrors: {
          offerId: ['Предложение больше недоступно.'],
          items: ['Проверьте состав заказа.'],
          'items.0.clientId': ['Идентификатор позиции уже используется.'],
          'items.0.name': ['Название уже используется.'],
        },
      }))
      .mockResolvedValueOnce(created)
    const data = createData(create)
    const onCreated = vi.fn()
    const wrapper = mount(CreateOrderOverlay, {
      props: {
        headingId: 'create-order-heading',
        payload: { data, currentUser, onCreated, title: 'Новый заказ' },
      },
    })
    await flushPromises()

    await wrapper.get('select[aria-label="Контрагент"]').setValue('contragent-2')
    await wrapper.get('input[aria-label="Название позиции 1"]').setValue('Редуктор')
    await wrapper.get('input[aria-label="Количество позиции 1"]').setValue('2')
    await wrapper.get('input[aria-label="Цена позиции 1, ₽"]').setValue('145000')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Проверьте позицию.')
    expect(wrapper.text()).toContain('Предложение больше недоступно.')
    expect(wrapper.text()).toContain('Проверьте состав заказа.')
    expect(wrapper.text()).toContain('Идентификатор позиции уже используется.')
    expect(wrapper.text()).toContain('Название уже используется.')
    expect(wrapper.get('input[aria-label="Название позиции 1"]').element.value).toBe('Редуктор')

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledTimes(2)
    expect(onCreated).toHaveBeenCalledWith(created)
  })
})
