import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fetchLogo, MAX_BYTES } from '@jobdekho/server/logos/fetch.js'
import { createLogoService } from '@jobdekho/server/logos/service.js'
import { RETRY_AFTER_MS } from '@jobdekho/server/logos/cache.js'
import { buildApp } from '@jobdekho/server/app.js'

// A temporary folder and a fake fetch per test: nothing here reaches the
// network or the real data folder.
let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-logos-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const LOGO = 'https://media.licdn.com/dms/image/company-logo_100_100/acme'
// A real PNG signature and header start, so the bytes read as a PNG.
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')])
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')
const answer = ({ status = 200, type = 'image/png', body = png, length } = {}) => vi.fn(async () => ({
  status,
  headers: { get: (name) => ({ 'content-type': type, 'content-length': length ?? String(body.length) })[name] },
  arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.length),
}))
const storeWith = (logoUrl) => ({ dir, corpus: { byId: () => new Map([['p1', { id: 'p1', logoUrl }]]) } })

describe('fetchLogo', () => {
  it('fetches a raster logo from an allowed host, refusing redirects', async () => {
    const fetchImpl = answer()
    expect(await fetchLogo(LOGO, { fetchImpl })).toEqual({ type: 'image/png', body: png })
    expect(fetchImpl.mock.calls[0][1].redirect).toBe('manual')
  })

  it('never asks a host the allowlist does not name', async () => {
    const fetchImpl = answer()
    expect(await fetchLogo('https://127.0.0.1/admin', { fetchImpl })).toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  // Instahyre's storage labels WebP logos application/octet-stream.
  it('trusts the bytes over the declared type', async () => {
    expect(await fetchLogo(LOGO, { fetchImpl: answer({ type: 'application/octet-stream', body: webp }) })).toEqual({ type: 'image/webp', body: webp })
    expect(await fetchLogo(LOGO, { fetchImpl: answer({ type: 'image/png', body: svg }) })).toBeNull()
  })

  it('refuses SVG, redirects, errors and anything too big to be a logo', async () => {
    expect(await fetchLogo(LOGO, { fetchImpl: answer({ type: 'image/svg+xml' }) })).toBeNull()
    expect(await fetchLogo(LOGO, { fetchImpl: answer({ status: 302 }) })).toBeNull()
    expect(await fetchLogo(LOGO, { fetchImpl: answer({ status: 404 }) })).toBeNull()
    expect(await fetchLogo(LOGO, { fetchImpl: answer({ length: String(MAX_BYTES + 1) }) })).toBeNull()
    expect(await fetchLogo(LOGO, { fetchImpl: vi.fn(async () => { throw new Error('offline') }) })).toBeNull()
  })
})

describe('createLogoService', () => {
  it('fetches a logo once, then serves it from the folder', async () => {
    const fetchImpl = answer()
    const logos = createLogoService({ store: storeWith(LOGO), fetchImpl })
    expect((await logos.forPosting('p1')).body).toEqual(png)
    expect((await logos.forPosting('p1')).body).toEqual(png)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(readdirSync(join(dir, 'logos'))).toHaveLength(1)
  })

  it('shares a fetch already in flight', async () => {
    const fetchImpl = answer()
    const logos = createLogoService({ store: storeWith(LOGO), fetchImpl })
    await Promise.all([logos.forPosting('p1'), logos.forPosting('p1'), logos.forPosting('p1')])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('remembers a failure for a week rather than asking on every view', async () => {
    let now = 1_000_000
    const fetchImpl = answer({ status: 404 })
    const logos = createLogoService({ store: storeWith(LOGO), fetchImpl, now: () => now })
    expect(await logos.forPosting('p1')).toBeNull()
    expect(await logos.forPosting('p1')).toBeNull()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    now += RETRY_AFTER_MS + 1
    await logos.forPosting('p1')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('has nothing for a posting without a logo, or not stored', async () => {
    const logos = createLogoService({ store: storeWith(null), fetchImpl: answer() })
    expect(await logos.forPosting('p1')).toBeNull()
    expect(await logos.forPosting('nope')).toBeNull()
  })
})

describe('GET /api/postings/:id/logo', () => {
  async function appWith(logo) {
    const app = buildApp({ config: { sessionSecret: 'test-secret', devUserId: 'local' } })
    app.decorate('logos', { forPosting: async (id) => (id === 'p1' ? logo : null) })
    await app.ready()
    return app
  }

  it('serves the image with its type, cached and never sniffed', async () => {
    const app = await appWith({ type: 'image/webp', body: png })
    const res = await app.inject({ method: 'GET', url: '/api/postings/p1/logo' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('image/webp')
    expect(res.headers['cache-control']).toContain('max-age')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.rawPayload).toEqual(png)
    await app.close()
  })

  it('answers 404 where there is no logo, so the page shows initials', async () => {
    const app = await appWith(null)
    expect((await app.inject({ method: 'GET', url: '/api/postings/p2/logo' })).statusCode).toBe(404)
    await app.close()
  })
})
