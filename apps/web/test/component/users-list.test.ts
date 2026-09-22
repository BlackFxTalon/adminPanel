import type { AuthenticatedUser, UsersPage, UsersQuery } from '@admin-panel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppShell from '../../app/components/AppShell.vue'
import SettingsView from '../../app/users/SettingsView.vue'
import UsersListView from '../../app/users/UsersListView.vue'
import type { UsersData } from '../../app/users/users-data'

const currentUser: AuthenticatedUser = {
  id: 'user-current',
  email: 'current@example.invalid',
  name: 'Текущий пользователь',
  role: 'admin',
  organization: { id: 'organization-current', name: 'Текущая организация' },
}

const page: UsersPage = {
  items: [
    {
      id: 'user-1',
      email: 'anna@example.invalid',
      name: 'Анна Волкова',
      role: 'admin',
      organization: { id: 'organization-1', name: 'Моя компания' },
    },
    {
      id: 'user-2',
      email: 'petrov@example.invalid',
      name: 'Иван Петров',
      role: 'user',
      organization: { id: 'organization-1', name: 'Моя компания' },
    },
  ],
  page: 1,
  pageSize: 10,
  total: 2,
}

describe('Users list', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('loads through the seam, renders Users with roles and sends server-shaped queries', async () => {
    const list = vi.fn<(query: UsersQuery) => Promise<UsersPage>>().mockResolvedValue(page)
    const data: UsersData = { list }
    const wrapper = mount(UsersListView, { props: { data } })

    expect(wrapper.get('[role="status"]').text()).toContain('Загружаем пользователей')
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Анна Волкова')
    expect(rows[0]!.text()).toContain('anna@example.invalid')
    expect(rows[0]!.text()).toContain('Администратор')
    expect(rows[1]!.text()).toContain('Пользователь')
    expect(wrapper.get('nav[aria-label="Пагинация пользователей"]').text()).toContain('Страница 1 из 1')

    await wrapper.get('input[aria-label="Поиск пользователей"]').setValue('анна')
    await wrapper.get('form[role="search"]').trigger('submit')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'анна' }))

    await wrapper.get('select[aria-label="Фильтр по роли"]').setValue('admin')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'admin', page: 1 }))
  })

  it('shows empty and failure states with retry', async () => {
    const list = vi.fn<(query: UsersQuery) => Promise<UsersPage>>()
      .mockRejectedValueOnce(new Error('Сервис пользователей недоступен.'))
      .mockResolvedValueOnce({ ...page, items: [], total: 0 })
    const data: UsersData = { list }
    const wrapper = mount(UsersListView, { props: { data } })

    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Сервис пользователей недоступен')
    expect(wrapper.find('tbody').exists()).toBe(false)

    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe('Пользователи не найдены')
  })
})

describe('Settings', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('reads the session user from the auth boundary and opens shared Overlays with dirty-state flow', async () => {
    const wrapper = mount(AppShell, {
      attachTo: document.body,
      slots: { default: () => h(SettingsView, { currentUser }) },
      global: { stubs: { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
    })
    await flushPromises()
    const activeDialog = () => wrapper.findAll('[role="dialog"]').find(dialog => dialog.isVisible())!

    expect(wrapper.get('[data-testid="settings-name"]').text()).toBe('Текущий пользователь')

    await wrapper.get('[data-testid="edit-profile"]').trigger('click')
    await flushPromises()
    expect(activeDialog().get('h2').text()).toBe('Настройки профиля')
    expect(activeDialog().find('input').exists()).toBe(true)

    const input = activeDialog().get('input')
    await input.setValue('Изменённое имя')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(activeDialog().get('h2').text()).toBe('Отменить изменения?')

    await activeDialog().get('button:last-child').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.get('[data-testid="organization-info"]').trigger('click')
    await flushPromises()
    expect(activeDialog().get('h2').text()).toBe('Организация')
    expect(activeDialog().text()).toContain('Текущая организация')
    wrapper.unmount()
  })
})
