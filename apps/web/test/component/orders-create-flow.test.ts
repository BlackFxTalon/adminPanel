import type {
  AuthenticatedUser,
  CreateOrderInput,
  OrderCreationOptions,
  OrderDetail,
  OrdersPage,
  OrdersQuery,
} from '@admin-panel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppShell from '../../app/components/AppShell.vue'
import OrdersListView from '../../app/orders/OrdersListView.vue'
import type { OrdersData } from '../../app/orders/orders-data'

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
  totalMinor: 29000000,
  currency: 'RUB',
  status: 'pending_approval',
  responsibleUser: { id: currentUser.id, name: currentUser.name },
  organization: currentUser.organization,
  items: [{ id: 'order-7-item-1', name: 'Редуктор', quantity: 2, unitPriceMinor: 14500000, amountMinor: 29000000 }],
}

const initialPage: OrdersPage = {
  items: [],
  page: 1,
  pageSize: 10,
  total: 0,
  filterOptions: { contragents: options.contragents },
}

function createData(): OrdersData {
  return {
    list: vi.fn<(query: OrdersQuery) => Promise<OrdersPage>>()
      .mockResolvedValueOnce(initialPage)
      .mockResolvedValue({
        ...initialPage,
        items: [created],
        total: 1,
      }),
    detail: vi.fn<(id: string) => Promise<OrderDetail>>(),
    creationOptions: vi.fn().mockResolvedValue(options),
    create: vi.fn<(input: CreateOrderInput) => Promise<OrderDetail>>().mockResolvedValue(created),
  }
}

const NuxtLink = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('Create Order flow', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('uses the shared Overlay lifecycle, preserves nested form state and updates the list from the response', async () => {
    const data = createData()
    const wrapper = mount(AppShell, {
      attachTo: document.body,
      slots: { default: () => h(OrdersListView, { data, currentUser }) },
      global: { stubs: { NuxtLink } },
    })
    await flushPromises()
    const activeDialog = () => wrapper.findAll('[role="dialog"]').find(dialog => dialog.isVisible())!

    await wrapper.get('button[aria-label="Создать заказ"]').trigger('click')
    await flushPromises()

    expect(activeDialog().attributes('aria-labelledby')).toBeTruthy()
    expect(activeDialog().get('h2').text()).toBe('Новый заказ')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Контрагент')

    const name = wrapper.get('input[aria-label="Название позиции 1"]')
    await name.setValue('Черновик')
    await wrapper.get('button[aria-label="Справка о предложении"]').trigger('click')
    await nextTick()
    expect(activeDialog().get('h2').text()).toBe('Предложение')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.get('input[aria-label="Название позиции 1"]').element.value).toBe('Черновик')

    await wrapper.get('button[aria-label="Закрыть"]').trigger('click')
    await nextTick()
    expect(activeDialog().get('h2').text()).toBe('Отменить изменения?')
    await activeDialog().get('button[data-overlay-initial-focus]').trigger('click')
    await nextTick()
    expect(wrapper.get('input[aria-label="Название позиции 1"]').element.value).toBe('Черновик')

    await wrapper.get('select[aria-label="Контрагент"]').setValue('contragent-2')
    await wrapper.get('input[aria-label="Название позиции 1"]').setValue('Редуктор')
    await wrapper.get('input[aria-label="Количество позиции 1"]').setValue('2')
    await wrapper.get('input[aria-label="Цена позиции 1, ₽"]').setValue('145000')
    await activeDialog().get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('tbody').text()).toContain('ORD-2026-007')
    expect(wrapper.get('tbody').text()).toContain('Текущий пользователь')
    expect(data.create).toHaveBeenCalledTimes(1)
    expect(data.list).toHaveBeenCalledTimes(2)
    expect(data.list).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    })
    wrapper.unmount()
  })

  it('discards dirty form state only after confirmation', async () => {
    const data = createData()
    const wrapper = mount(AppShell, {
      attachTo: document.body,
      slots: { default: () => h(OrdersListView, { data, currentUser }) },
      global: { stubs: { NuxtLink } },
    })
    await flushPromises()
    const activeDialog = () => wrapper.findAll('[role="dialog"]').find(dialog => dialog.isVisible())!

    await wrapper.get('button[aria-label="Создать заказ"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[aria-label="Название позиции 1"]').setValue('Будет удалено')
    await wrapper.get('button[aria-label="Закрыть"]').trigger('click')
    await nextTick()
    await activeDialog().get('button:last-child').trigger('click')
    await nextTick()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await wrapper.get('button[aria-label="Создать заказ"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('input[aria-label="Название позиции 1"]').element.value).toBe('')
    wrapper.unmount()
  })
})
