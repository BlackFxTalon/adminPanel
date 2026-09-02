import { createMockOrdersData } from './mock-orders-data'
import type { OrdersData } from './orders-data'

const instances = new WeakMap<object, OrdersData>()

export function useOrdersData(): OrdersData {
  const nuxtApp = useNuxtApp()
  const existing = instances.get(nuxtApp)
  if (existing) return existing

  const auth = useAuthSession()
  const data = createMockOrdersData(() => {
    const user = auth.user.value
    if (!user) throw new Error('Для создания Order требуется активная сессия.')
    return user
  })
  instances.set(nuxtApp, data)
  return data
}
