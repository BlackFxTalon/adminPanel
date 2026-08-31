export type AuthRouteDecision = { readonly allow: true } | { readonly redirectTo: '/login' }

export function resolveAuthRoute(path: string, isAuthenticated: boolean): AuthRouteDecision {
  if (path === '/login' || isAuthenticated) return { allow: true }
  return { redirectTo: '/login' }
}