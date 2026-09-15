import { describe, it, expect } from 'vitest'
import { loadConfig } from '@jobdekho/server/config.js'

describe('loadConfig', () => {
  it('coerces port to a number', () => {
    expect(loadConfig({ PORT: '8080' }).port).toBe(8080)
  })
  it('applies the default port', () => {
    expect(loadConfig({}).port).toBe(3000)
  })
  it('uses dev-insecure-secret when SESSION_SECRET is absent in dev', () => {
    const c = loadConfig({ NODE_ENV: 'development' })
    expect(c.sessionSecret).toBe('dev-insecure-secret')
  })
  it('exposes the local user id outside production', () => {
    expect(loadConfig({ DEV_AUTH_USER_ID: 'u1' }).devUserId).toBe('u1')
    expect(loadConfig({}).devUserId).toBeNull()
  })

  // The whole point of the flag: setting it on a deployed box must do nothing.
  it('refuses the local identity in production', () => {
    const c = loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 's', DEV_AUTH_USER_ID: 'u1' })
    expect(c.devUserId).toBeNull()
  })

  it('throws in production when SESSION_SECRET is missing', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
      'SESSION_SECRET is required in production'
    )
  })
  it('uses provided SESSION_SECRET in production', () => {
    const c = loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 's' })
    expect(c.sessionSecret).toBe('s')
  })

  // There is no sign-in any more, so the port is the only thing between a
  // stranger on the same wifi and this person's resume and CLI subscription.
  it('answers on this machine only unless someone deliberately says otherwise', () => {
    expect(loadConfig({}).host).toBe('127.0.0.1')
    expect(loadConfig({ HOST: '0.0.0.0' }).host).toBe('0.0.0.0')
  })
})
