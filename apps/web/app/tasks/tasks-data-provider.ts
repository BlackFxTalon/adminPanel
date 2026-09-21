import { createHttpTasksData } from './http-tasks-data'
import { createMockTasksData } from './mock-tasks-data'
import type { TasksData } from './tasks-data'

const instances = new WeakMap<object, TasksData>()

export function useTasksData(): TasksData {
  const nuxtApp = useNuxtApp()
  const existing = instances.get(nuxtApp)
  if (existing) return existing

  const auth = useAuthSession()
  const config = useRuntimeConfig()
  const data = config.public.ordersDataMode === 'http'
    ? createHttpTasksData({
        apiBase: import.meta.server ? config.apiInternalBase : config.public.apiBase,
        accessToken: () => auth.accessToken.value,
        request: (url, options) => $fetch(url, {
          ...options,
          body: options.body as Record<string, unknown> | undefined,
        }),
      })
    : createMockTasksData(() => {
        const user = auth.user.value
        if (!user) throw new Error('Для работы с Tasks требуется активная сессия.')
        return user
      })
  instances.set(nuxtApp, data)
  return data
}
