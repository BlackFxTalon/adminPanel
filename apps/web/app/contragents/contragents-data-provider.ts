import { createHttpContragentsData } from './http-contragents-data'
import { createMockContragentsData } from './mock-contragents-data'
import type { ContragentsData } from './contragents-data'

const instances = new WeakMap<object, ContragentsData>()

export function useContragentsData(): ContragentsData {
  const nuxtApp = useNuxtApp()
  const existing = instances.get(nuxtApp)
  if (existing) return existing

  const auth = useAuthSession()
  const config = useRuntimeConfig()
  const data = config.public.ordersDataMode === 'http'
    ? createHttpContragentsData({
        apiBase: import.meta.server ? config.apiInternalBase : config.public.apiBase,
        accessToken: () => auth.accessToken.value,
        request: (url, options) => $fetch(url, { headers: options.headers }),
      })
    : createMockContragentsData(() => {
        const user = auth.user.value
        if (!user) throw new Error('Для работы с Contragents требуется активная сессия.')
        return user
      })
  instances.set(nuxtApp, data)
  return data
}
