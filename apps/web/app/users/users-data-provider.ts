import { createHttpUsersData } from './http-users-data'
import { createMockUsersData } from './mock-users-data'
import type { UsersData } from './users-data'

const instances = new WeakMap<object, UsersData>()

export function useUsersData(): UsersData {
  const nuxtApp = useNuxtApp()
  const existing = instances.get(nuxtApp)
  if (existing) return existing

  const auth = useAuthSession()
  const config = useRuntimeConfig()
  const data = config.public.ordersDataMode === 'http'
    ? createHttpUsersData({
        apiBase: import.meta.server ? config.apiInternalBase : config.public.apiBase,
        accessToken: () => auth.accessToken.value,
        request: (url, options) => $fetch(url, { headers: options.headers }),
      })
    : createMockUsersData()
  instances.set(nuxtApp, data)
  return data
}
