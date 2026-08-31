import { resolveAuthRoute } from '../auth/route-policy'
import { useAuthSession } from '../composables/useAuthSession'

export default defineNuxtRouteMiddleware(async to => {
  const auth = useAuthSession()
  if (to.path !== '/login') await auth.restore({ revalidate: true })
  const decision = resolveAuthRoute(to.path, auth.user.value !== null)
  if ('redirectTo' in decision) return navigateTo(decision.redirectTo)
})