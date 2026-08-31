import { describe, expect, it, vi } from 'vitest'

import { revokeSessionAndClearClient } from '../../app/auth/logout-session'

describe('logout session transition', () => {
  it('clears local state only after server-side revocation succeeds', async () => {
    const clearClientSession = vi.fn()

    await expect(revokeSessionAndClearClient(async () => undefined, clearClientSession)).resolves.toBe(true)
    expect(clearClientSession).toHaveBeenCalledOnce()
  })

  it('preserves local state when server-side revocation fails', async () => {
    const clearClientSession = vi.fn()

    await expect(revokeSessionAndClearClient(async () => {
      throw new Error('network unavailable')
    }, clearClientSession)).resolves.toBe(false)
    expect(clearClientSession).not.toHaveBeenCalled()
  })
})
