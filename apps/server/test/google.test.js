import { describe, it, expect, vi } from 'vitest'
import { fetchGoogleProfile, completeLogin } from '@jobdekho/server/auth/google.js'

describe('fetchGoogleProfile', () => {
  it('maps google userinfo to a GoogleProfile', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ sub: 'g9', email: 'a@b.c', name: 'A', picture: 'p' }) }))
    const profile = await fetchGoogleProfile('tok', fetchImpl)
    expect(profile).toEqual({ googleId: 'g9', email: 'a@b.c', name: 'A', avatarUrl: 'p' })
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')
  })
})

describe('completeLogin', () => {
  it('upserts the user, issues a session, and redirects home', async () => {
    const calls = {}
    const reply = {
      server: { jwt: { sign: () => 'signed' } },
      setCookie: (n, v) => { calls.cookie = { n, v } },
      redirect: (to) => { calls.redirect = to; return 'redirected' },
    }
    const userStore = { upsertUser: vi.fn(async (p) => ({ id: 'u1', ...p })) }
    const out = await completeLogin(reply, userStore, { googleId: 'g1', email: 'a@b.c', name: 'A', avatarUrl: null })
    expect(userStore.upsertUser).toHaveBeenCalledOnce()
    expect(calls.cookie.n).toBe('session')
    expect(calls.redirect).toBe('/')
    expect(out).toBe('redirected')
  })
})
