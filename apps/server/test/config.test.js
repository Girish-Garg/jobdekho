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
})
