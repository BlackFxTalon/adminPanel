import { describe, expect, it } from 'vitest'

import { resolveAuthRoute } from '../../app/auth/route-policy'

describe('protected route policy', () => {
  it('allows the public login route without a session', () => {
    expect(resolveAuthRoute('/login', false)).toEqual({ allow: true })
  })

  it('redirects a protected route to login without a session', () => {
    expect(resolveAuthRoute('/orders', false)).toEqual({ redirectTo: '/login' })
  })

  it('allows a protected route for an authenticated User', () => {
    expect(resolveAuthRoute('/orders', true)).toEqual({ allow: true })
  })
})