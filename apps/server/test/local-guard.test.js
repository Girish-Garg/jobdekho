import { describe, it, expect } from 'vitest'
import { hostName, isLocalHost, refusal } from '@jobdekho/server/auth/local-guard.js'
import { buildApp } from '@jobdekho/server/app.js'

const req = (method, headers) => ({ method, headers: { host: 'localhost:3000', ...headers } })

describe('hostName and isLocalHost', () => {
  it('reads a host name from a Host or an Origin, port or not', () => {
    expect(hostName('localhost:3000')).toBe('localhost')
    expect(hostName('http://127.0.0.1:5173')).toBe('127.0.0.1')
    expect(hostName('[::1]:3000')).toBe('[::1]')
    expect(hostName('')).toBeNull()
  })

  it('knows only this computer as local', () => {
    expect(isLocalHost('localhost:3000')).toBe(true)
    expect(isLocalHost('http://localhost:5173')).toBe(true)
    expect(isLocalHost('evil.example')).toBe(false)
    expect(isLocalHost('localhost.evil.example')).toBe(false)
    expect(isLocalHost(undefined)).toBe(false)
  })
})

describe('refusal', () => {
  // DNS rebinding: an attacker's name pointed at 127.0.0.1 arrives as Host.
  it('refuses any request addressed to another name, reads included', () => {
    expect(refusal(req('GET', { host: 'rebind.evil.example:3000' }))).toMatch(/own address/)
  })

  it('refuses writes another site sends through the browser', () => {
    expect(refusal(req('POST', { origin: 'https://evil.example' }))).toMatch(/Another site/)
    expect(refusal(req('PUT', { 'sec-fetch-site': 'cross-site' }))).toMatch(/Another site/)
    expect(refusal(req('GET', { upgrade: 'websocket', origin: 'https://evil.example' }))).toMatch(/Another site/)
  })

  it('lets in the app itself, the dev server, and tools that are not browsers', () => {
    expect(refusal(req('POST', { origin: 'http://localhost:3000', 'sec-fetch-site': 'same-origin' }))).toBeNull()
    expect(refusal(req('POST', { origin: 'http://localhost:5173', 'sec-fetch-site': 'same-site' }))).toBeNull()
    expect(refusal(req('POST', {}))).toBeNull()
    expect(refusal(req('DELETE', { origin: 'http://127.0.0.1:3000' }))).toBeNull()
  })

  // Without CORS headers the browser never hands another site the answer.
  it('leaves cross-site reads alone', () => {
    expect(refusal(req('GET', { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }))).toBeNull()
  })
})

describe('the guard on the app', () => {
  const app = () => buildApp({ config: { sessionSecret: 'test-secret', devUserId: 'local' } })

  it('answers 403 to a rebound name before any route runs', async () => {
    const a = app()
    const res = await a.inject({ method: 'GET', url: '/api/postings', headers: { host: 'rebind.evil.example' } })
    expect(res.statusCode).toBe(403)
    await a.close()
  })

  it('answers 403 to a cross-site write', async () => {
    const a = app()
    const res = await a.inject({ method: 'POST', url: '/api/scrape', headers: { origin: 'https://evil.example' } })
    expect(res.statusCode).toBe(403)
    await a.close()
  })
})
