import { createHttpOffersData } from './http-offers-data'
import { createMockOffersData } from './mock-offers-data'
import type { OffersData } from './offers-data'

const instances = new WeakMap<object, OffersData>()

export function useOffersData(): OffersData {
  const nuxtApp = useNuxtApp()
  const existing = instances.get(nuxtApp)
  if (existing) return existing

  const auth = useAuthSession()
  const config = useRuntimeConfig()
  const data = config.public.ordersDataMode === 'http'
    ? createHttpOffersData({
        apiBase: import.meta.server ? config.apiInternalBase : config.public.apiBase,
        accessToken: () => auth.accessToken.value,
        request: (url, options) => $fetch(url, { headers: options.headers }),
      })
    : createMockOffersData(() => {
        const user = auth.user.value
        if (!user) throw new Error('Для работы с Offers требуется активная сессия.')
        return user
      })
  instances.set(nuxtApp, data)
  return data
}
