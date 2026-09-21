import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ContragentsDirectoryView from '../../app/contragents/ContragentsDirectoryView.vue'
import type { ContragentDirectoryPage, ContragentLookupItem, ContragentsData } from '../../app/contragents/contragents-data'

const page: ContragentDirectoryPage = {
  items: [
    { id: 'contragent-1', kind: 'company', displayName: 'Уралмашзавод', phone: '+7 343 111-22-33', email: 'info@uralmash.invalid' },
    { id: 'contragent-3', kind: 'contact', displayName: 'Анна Соколова', phone: '+7 912 333-44-55', email: 'anna@uralreduktor.invalid', companyName: 'Уралредуктор' },
  ],
  page: 1,
  pageSize: 10,
  total: 2,
}

const lookupItems: readonly ContragentLookupItem[] = [
  { id: 'contragent-1', label: 'Уралмашзавод', kind: 'company' },
]

describe('Contragents directory', () => {
  it('renders Company and Contact entries with accessible controls', async () => {
    const data: ContragentsData = {
      lookup: vi.fn().mockResolvedValue(lookupItems),
      directory: vi.fn().mockResolvedValue(page),
    }
    const wrapper = mount(ContragentsDirectoryView, { props: { data } })

    expect(wrapper.get('[role="status"]').text()).toContain('Загружаем')
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Компания')
    expect(rows[1]!.text()).toContain('Контакт')
    expect(rows[1]!.text()).toContain('Уралредуктор')
    expect(wrapper.get('input[aria-label="Поиск контрагентов"]').exists()).toBe(true)
    expect(wrapper.get('select[aria-label="Фильтр по типу контрагента"]').exists()).toBe(true)
    expect(wrapper.get('nav[aria-label="Пагинация контрагентов"]').text()).toContain('Страница 1 из 1')
  })

  it('sends server-shaped queries and reloads from the seam', async () => {
    const directory = vi.fn()
      .mockImplementation((query: { kind?: string }) => Promise.resolve(
        query.kind ? { ...page, items: [], total: 0 } : page,
      ))
    const data: ContragentsData = {
      lookup: vi.fn().mockResolvedValue(lookupItems),
      directory,
    }
    const wrapper = mount(ContragentsDirectoryView, { props: { data } })
    await flushPromises()

    await wrapper.get('input[aria-label="Поиск контрагентов"]').setValue('урал')
    await wrapper.get('form[role="search"]').trigger('submit')
    await flushPromises()
    expect(directory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'урал' }))

    await wrapper.get('select[aria-label="Фильтр по типу контрагента"]').setValue('company')
    await flushPromises()
    expect(directory).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'company', page: 1 }))
    expect(wrapper.text()).toContain('Контрагенты не найдены')
  })

  it('shows a failure state with retry and resolves lookup identifiers used by Create Order', async () => {
    const directory = vi.fn()
      .mockRejectedValueOnce(new Error('Сервис контрагентов недоступен.'))
      .mockResolvedValueOnce(page)
    const data: ContragentsData = { lookup: vi.fn().mockResolvedValue(lookupItems), directory }
    const wrapper = mount(ContragentsDirectoryView, { props: { data } })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Сервис контрагентов недоступен')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('tbody tr').text()).toContain('Уралмашзавод')
  })
})
