import type { AuthenticatedUser, CreateTaskInput } from '@admin-panel/contracts'
import { describe, expect, it, vi } from 'vitest'

import { createMockTasksData } from '../../app/tasks/mock-tasks-data'
import { createHttpTasksData } from '../../app/tasks/http-tasks-data'
import type { TasksDataError } from '../../app/tasks/tasks-data'

const currentUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@example.invalid',
  name: 'Анна Волкова',
  role: 'user',
  organization: { id: 'organization-1', name: 'Моя компания' },
}

describe('Tasks data seam', () => {
  it('returns deterministic paginated Tasks with Organization-scoped filter options', async () => {
    const tasks = createMockTasksData(() => currentUser)

    const firstPage = await tasks.list({ page: 1, pageSize: 1, sortBy: 'createdAt', sortDirection: 'desc', mine: false })
    expect(firstPage.total).toBe(2)
    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.items[0]).toMatchObject({
      id: 'task-2',
      number: 'TASK-2026-002',
      title: 'Подготовить коммерческое предложение',
      status: 'in_progress',
      priority: 'medium',
      assignee: { id: 'user-2', name: 'Иван Петров' },
    })
    expect(firstPage.items[0]?.contragent).toBeUndefined()

    const secondPage = await tasks.list({ page: 2, pageSize: 1, sortBy: 'createdAt', sortDirection: 'desc', mine: false })
    expect(secondPage.items[0]).toMatchObject({
      id: 'task-1',
      number: 'TASK-2026-001',
      assignee: { id: 'user-1', name: 'Анна Волкова' },
      contragent: { id: 'contragent-1', label: 'Уралмашзавод' },
      order: { id: 'order-1', label: 'ORD-2026-001' },
    })
    expect(secondPage.filterOptions.assignees).toContainEqual({ id: 'user-2', name: 'Иван Петров' })
    expect(secondPage.filterOptions.contragents).toContainEqual({ id: 'contragent-1', label: 'Уралмашзавод' })
    expect(secondPage.filterOptions.orders).toContainEqual({ id: 'order-1', label: 'ORD-2026-001' })
  })

  it('searches, filters by status, assignee and mine, and validates queries', async () => {
    const tasks = createMockTasksData(() => currentUser)

    const searched = await tasks.list({ page: 1, pageSize: 10, search: 'позвонить', sortBy: 'title', sortDirection: 'asc', mine: false })
    expect(searched.items.map(task => task.number)).toEqual(['TASK-2026-001'])

    const byStatus = await tasks.list({ page: 1, pageSize: 10, status: 'in_progress', sortBy: 'title', sortDirection: 'asc', mine: false })
    expect(byStatus.items.map(task => task.number)).toEqual(['TASK-2026-002'])

    const byAssignee = await tasks.list({ page: 1, pageSize: 10, assigneeId: 'user-2', sortBy: 'title', sortDirection: 'asc', mine: false })
    expect(byAssignee.items.map(task => task.number)).toEqual(['TASK-2026-002'])

    const mine = await tasks.list({ page: 1, pageSize: 10, mine: true, sortBy: 'title', sortDirection: 'asc' })
    expect(mine.items.map(task => task.number)).toEqual(['TASK-2026-001'])

    await expect(tasks.list({ page: 0, pageSize: 10, sortBy: 'createdAt', sortDirection: 'desc', mine: false }))
      .rejects.toMatchObject<Partial<TasksDataError>>({ code: 'INVALID_TASKS_QUERY', requestId: 'mock-tasks-query' })
    await expect(tasks.list({ page: 1, pageSize: 101, sortBy: 'createdAt', sortDirection: 'desc', mine: false }))
      .rejects.toMatchObject<Partial<TasksDataError>>({ code: 'INVALID_TASKS_QUERY' })
  })

  it('creates a Task with optional links, trimmed title and default assignee', async () => {
    const tasks = createMockTasksData(() => currentUser)

    const withLinks = await tasks.create({
      title: '  Согласовать спецификацию  ',
      description: 'Проверить позиции.',
      priority: 'high',
      assigneeId: 'user-2',
      contragentId: 'contragent-2',
      orderId: 'order-2',
    })
    expect(withLinks).toMatchObject({
      number: 'TASK-2026-003',
      title: 'Согласовать спецификацию',
      status: 'open',
      priority: 'high',
      assignee: { id: 'user-2', name: 'Иван Петров' },
      contragent: { id: 'contragent-2', label: 'Уралредуктор' },
      organization: currentUser.organization,
    })

    const minimal = await tasks.create({
      title: 'Минимальная задача',
      priority: 'low',
      assigneeId: currentUser.id,
    })
    expect(minimal).toMatchObject({
      priority: 'low',
      status: 'open',
      assignee: { id: 'user-1', name: 'Анна Волкова' },
    })
    expect(minimal.contragent).toBeUndefined()
    expect(minimal.order).toBeUndefined()

    await expect(tasks.create({ title: ' ', priority: 'medium', assigneeId: 'user-1' } satisfies CreateTaskInput))
      .rejects.toMatchObject({ code: 'TASK_VALIDATION_FAILED', fieldErrors: { title: ['Введите название задачи.'] } })
  })
})

describe('HTTP Tasks data adapter', () => {
  it('implements the TasksData seam with bearer-authenticated versioned requests', async () => {
    const request = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 10, total: 0, filterOptions: {} })
    const data = createHttpTasksData({
      apiBase: 'http://api.example/api/v1/',
      accessToken: () => 'access-token',
      request,
    })

    await data.list({
      page: 2,
      pageSize: 5,
      search: 'задача',
      sortBy: 'title',
      sortDirection: 'asc',
      status: 'open',
      assigneeId: 'user-1',
      mine: true,
    })
    expect(request).toHaveBeenCalledWith(
      'http://api.example/api/v1/tasks?page=2&pageSize=5&search=%D0%B7%D0%B0%D0%B4%D0%B0%D1%87%D0%B0&sortBy=title&sortDirection=asc&status=open&assigneeId=user-1&mine=true',
      { headers: { Authorization: 'Bearer access-token' } },
    )

    await data.creationOptions()
    expect(request).toHaveBeenLastCalledWith('http://api.example/api/v1/tasks/creation-options', {
      headers: { Authorization: 'Bearer access-token' },
    })

    await data.create({ title: 'Задача', priority: 'high', assigneeId: 'user-1' })
    expect(request).toHaveBeenLastCalledWith('http://api.example/api/v1/tasks', {
      method: 'POST',
      body: { title: 'Задача', priority: 'high', assigneeId: 'user-1' },
      headers: { Authorization: 'Bearer access-token' },
    })
  })

  it('preserves structured backend errors and rejects calls without a session token', async () => {
    const request = vi.fn().mockRejectedValue({
      data: {
        code: 'TASK_VALIDATION_FAILED',
        message: 'Исправьте ошибки в форме.',
        requestId: 'request-1',
        fieldErrors: { title: ['Введите название задачи.'] },
      },
    })
    const data = createHttpTasksData({ apiBase: '/api/v1', accessToken: () => 'token', request })
    await expect(data.create({ title: '', priority: 'medium', assigneeId: 'user-1' })).rejects.toMatchObject({
      name: 'TasksDataError',
      code: 'TASK_VALIDATION_FAILED',
      requestId: 'request-1',
    })

    const withoutToken = createHttpTasksData({ apiBase: '/api/v1', accessToken: () => null, request })
    await expect(withoutToken.creationOptions()).rejects.toMatchObject({
      code: 'AUTH_REQUIRED',
      requestId: 'tasks-http-auth',
    })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
