import { describe, it, expect } from 'vitest'
import { loadConfig } from '@jobdekho/server/config.js'

describe('loadConfig', () => {
  it('maps env keys and coerces port to a number', () => {
    const c = loadConfig({ GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'sec', PORT: '8080' })
    expect(c.googleClientId).toBe('id')
    expect(c.googleClientSecret).toBe('sec')
    expect(c.port).toBe(8080)
  })
  it('applies dev defaults for baseUrl and port', () => {
    const c = loadConfig({})
    expect(c.baseUrl).toBe('http://localhost:3000')
    expect(c.port).toBe(3000)
  })
  it('uses dev-insecure-secret when SESSION_SECRET is absent in dev', () => {
    const c = loadConfig({ NODE_ENV: 'development' })
    expect(c.sessionSecret).toBe('dev-insecure-secret')
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
})
