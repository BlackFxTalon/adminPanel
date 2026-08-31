import type { AuthSessionResponse, AuthenticatedUser, LoginRequest } from '@admin-panel/contracts'

import { revokeSessionAndClearClient } from '../auth/logout-session'

interface ApiErrorBody {
  readonly data?: {
    readonly message?: string
  }
}

function errorMessage(error: unknown): string {
  const apiError = error as ApiErrorBody
  return apiError.data?.message ?? 'Не удалось выполнить вход'
}

export function useAuthSession() {
  const config = useRuntimeConfig()
  const requestFetch = useRequestFetch()
  const apiBase = import.meta.server ? config.apiInternalBase : config.public.apiBase
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const responseCookie = import.meta.server ? useResponseHeader('set-cookie') : undefined
  const accessToken = useState<string | null>('auth:access-token', () => null)
  const user = useState<AuthenticatedUser | null>('auth:user', () => null)
  const initialized = useState<boolean>('auth:initialized', () => false)
  const error = useState<string | null>('auth:error', () => null)

  function applySession(session: AuthSessionResponse): void {
    accessToken.value = session.accessToken
    user.value = session.user
    initialized.value = true
    error.value = null
  }

  function clearSession(): void {
    accessToken.value = null
    user.value = null
    initialized.value = true
    error.value = null
  }

  async function login(credentials: LoginRequest): Promise<boolean> {
    try {
      const session = await requestFetch<AuthSessionResponse>(`${apiBase}/auth/login`, {
        method: 'POST',
        body: credentials,
        credentials: 'include',
      })
      applySession(session)
      return true
    } catch (caught) {
      clearSession()
      error.value = errorMessage(caught)
      return false
    }
  }

  async function restore(options: { readonly revalidate?: boolean } = {}): Promise<boolean> {
    if (initialized.value && !options.revalidate) return user.value !== null
    if (accessToken.value) {
      try {
        user.value = await requestFetch<AuthenticatedUser>(`${apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken.value}` },
        })
        initialized.value = true
        return true
      } catch {
        accessToken.value = null
      }
    }
    try {
      const response = await $fetch.raw<AuthSessionResponse>(`${apiBase}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: requestHeaders,
      })
      const session = response._data
      if (!session) throw new Error('Empty refresh response')
      const setCookie = response.headers.get('set-cookie')
      if (responseCookie && setCookie) responseCookie.value = setCookie
      applySession(session)
      return true
    } catch {
      clearSession()
      return false
    }
  }

  async function logout(): Promise<boolean> {
    const revoked = await revokeSessionAndClearClient(
      () => requestFetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }),
      clearSession,
    )
    if (!revoked) {
      error.value = 'Не удалось завершить сессию. Повторите попытку.'
      return false
    }
    await navigateTo('/login')
    return true
  }

  return {
    accessToken: readonly(accessToken),
    error: readonly(error),
    initialized: readonly(initialized),
    user: readonly(user),
    login,
    logout,
    restore,
  }
}