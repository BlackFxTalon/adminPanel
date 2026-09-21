import type { AuthenticatedUser, CreateTaskInput, TaskCreationOptions, TaskDetail, TasksPage, TasksQuery } from '@admin-panel/contracts'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppShell from '../../app/components/AppShell.vue'
import TasksListView from '../../app/tasks/TasksListView.vue'
import type { TasksData } from '../../app/tasks/tasks-data'

const currentUser: AuthenticatedUser = {
  id: 'user-current',
  email: 'current@example.invalid',
  name: 'Текущий пользователь',
  role: 'user',
  organization: { id: 'organization-current', name: 'Текущая организация' },
}

const options: TaskCreationOptions = {
  assignees: [
    { id: 'user-current', name: 'Текущий пользователь' },
    { id: 'user-2', name: 'Иван Петров' },
  ],
  contragents: [{ id: 'contragent-1', label: 'Уралмашзавод' }],
  orders: [{ id: 'order-1', label: 'ORD-2026-001' }],
}

const createdTask: TaskDetail = {
  id: 'task-3',
  createdAt: '2026-08-24T10:00:00.000Z',
  number: 'TASK-2026-003',
  title: 'Согласовать спецификацию',
  status: 'open',
  priority: 'high',
  assignee: { id: 'user-2', name: 'Иван Петров' },
  contragent: { id: 'contragent-1', label: 'Уралмашзавод' },
  order: { id: 'order-1', label: 'ORD-2026-001' },
  organization: currentUser.organization,
}

const initialPage: TasksPage = {
  items: [
    {
      id: 'task-1',
      createdAt: '2026-08-18T09:30:00.000Z',
      number: 'TASK-2026-001',
      title: 'Позвонить контрагенту',
      status: 'open',
      priority: 'high',
      assignee: { id: 'user-current', name: 'Текущий пользователь' },
      contragent: { id: 'contragent-1', label: 'Уралмашзавод' },
      organization: currentUser.organization,
    },
    {
      id: 'task-2',
      createdAt: '2026-08-20T11:00:00.000Z',
      number: 'TASK-2026-002',
      title: 'Подготовить коммерческое предложение',
      status: 'in_progress',
      priority: 'medium',
      assignee: { id: 'user-2', name: 'Иван Петров' },
      organization: currentUser.organization,
    },
  ],
  page: 1,
  pageSize: 10,
  total: 2,
  filterOptions: options,
}

function createData(create = vi.fn<(input: CreateTaskInput) => Promise<TaskDetail>>().mockResolvedValue(createdTask)): TasksData {
  return {
    list: vi.fn<(query: TasksQuery) => Promise<TasksPage>>()
      .mockResolvedValueOnce(initialPage)
      .mockResolvedValue({
        ...initialPage,
        items: [...initialPage.items, createdTask],
        total: 3,
      }),
    creationOptions: vi.fn().mockResolvedValue(options),
    create,
  }
}

const NuxtLink = { props: ['to'], template: '<a :href="to"><slot /></a>' }

describe('Tasks list', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('loads through the seam, renders identifying data and sends server-shaped queries', async () => {
    const list = vi.fn<(query: TasksQuery) => Promise<TasksPage>>().mockResolvedValue(initialPage)
    const data: TasksData = { list, creationOptions: vi.fn(), create: vi.fn() }
    const wrapper = mount(TasksListView, { props: { data }, global: { stubs: { NuxtLink } } })

    expect(wrapper.get('[role="status"]').text()).toContain('Загружаем задачи')
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0]!.text()).toContain('Позвонить контрагенту')
    expect(rows[0]!.text()).toContain('TASK-2026-001')
    expect(rows[0]!.text()).toContain('Открыта')
    expect(rows[0]!.text()).toContain('Высокий')
    expect(rows[0]!.text()).toContain('Уралмашзавод')
    expect(rows[1]!.text()).toContain('Иван Петров')
    expect(rows[1]!.text()).toContain('В работе')

    await wrapper.get('input[aria-label="Поиск задач"]').setValue('позвонить')
    await wrapper.get('form[role="search"]').trigger('submit')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'позвонить' }))

    await wrapper.get('select[aria-label="Фильтр по статусу задачи"]').setValue('in_progress')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'in_progress', page: 1 }))

    await wrapper.get('select[aria-label="Фильтр по исполнителю"]').setValue('user-2')
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ assigneeId: 'user-2' }))

    await wrapper.get('input[aria-label="Только мои задачи"]').setValue(true)
    await flushPromises()
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ mine: true }))
  })

  it('shows empty and failure states with retry', async () => {
    const list = vi.fn<(query: TasksQuery) => Promise<TasksPage>>()
      .mockRejectedValueOnce(new Error('Сервис задач временно недоступен.'))
      .mockResolvedValueOnce({ ...initialPage, items: [], total: 0 })
    const data: TasksData = { list, creationOptions: vi.fn(), create: vi.fn() }
    const wrapper = mount(TasksListView, { props: { data } })

    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Сервис задач временно недоступен')
    expect(wrapper.find('tbody').exists()).toBe(false)

    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe('Задачи не найдены')
  })
})

describe('Create Task flow', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('uses the shared Overlay lifecycle, keeps optional links optional and updates the list from the response', async () => {
    const data = createData()
    const wrapper = mount(AppShell, {
      attachTo: document.body,
      slots: { default: () => h(TasksListView, { data, currentUser }) },
      global: { stubs: { NuxtLink } },
    })
    await flushPromises()
    const activeDialog = () => wrapper.findAll('[role="dialog"]').find(dialog => dialog.isVisible())!

    await wrapper.get('button[aria-label="Создать задачу"]').trigger('click')
    await flushPromises()

    expect(activeDialog().attributes('aria-labelledby')).toBeTruthy()
    expect(activeDialog().get('h2').text()).toBe('Новая задача')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Название задачи')

    await wrapper.get('input[aria-label="Название задачи"]').setValue('Согласовать спецификацию')
    await wrapper.get('select[aria-label="Исполнитель задачи"]').setValue('user-2')
    await wrapper.get('select[aria-label="Контрагент задачи"]').setValue('contragent-1')
    await wrapper.get('select[aria-label="Заказ задачи"]').setValue('order-1')
    await activeDialog().get('form').trigger('submit')
    await flushPromises()

    expect(data.create).toHaveBeenCalledWith({
      title: 'Согласовать спецификацию',
      priority: 'medium',
      assigneeId: 'user-2',
      contragentId: 'contragent-1',
      orderId: 'order-1',
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('tbody').text()).toContain('TASK-2026-003')
    expect(wrapper.get('tbody').text()).toContain('Согласовать спецификацию')
    expect(data.list).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('shows the field error for an empty title, keeps values and asks for confirmation on a dirty close', async () => {
    const create = vi.fn<(input: CreateTaskInput) => Promise<TaskDetail>>()
    const data = createData(create)
    const wrapper = mount(AppShell, {
      attachTo: document.body,
      slots: { default: () => h(TasksListView, { data, currentUser }) },
      global: { stubs: { NuxtLink } },
    })
    await flushPromises()
    const activeDialog = () => wrapper.findAll('[role="dialog"]').find(dialog => dialog.isVisible())!

    await wrapper.get('button[aria-label="Создать задачу"]').trigger('click')
    await flushPromises()

    await activeDialog().get('form').trigger('submit')
    await flushPromises()
    expect(create).not.toHaveBeenCalled()
    expect(wrapper.get('input[aria-label="Название задачи"]').attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('Введите название задачи.')

    await wrapper.get('input[aria-label="Название задачи"]').setValue('Черновик задачи')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(activeDialog().get('h2').text()).toBe('Отменить изменения?')

    await activeDialog().get('button[data-overlay-initial-focus]').trigger('click')
    await nextFrame()
    expect(wrapper.get('input[aria-label="Название задачи"]').element.value).toBe('Черновик задачи')
    wrapper.unmount()
  })
})

function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}
