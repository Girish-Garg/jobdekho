import { describe, it, expect, vi } from 'vitest'
import { createHttp } from '@jobdekho/sources/http.js'

describe('createHttp', () => {
  it('sets a User-Agent and returns the response on 2xx', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }))
    const http = createHttp({ fetchImpl, userAgent: 'UA/1' })
    const res = await http('https://x')
    expect(res.ok).toBe(true)
    expect(fetchImpl.mock.calls[0][1].headers['User-Agent']).toBe('UA/1')
  })
  it('throws on non-2xx', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503 }))
    const http = createHttp({ fetchImpl })
    await expect(http('https://x')).rejects.toThrow(/503/)
  })
})
