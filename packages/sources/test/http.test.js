import { describe, it, expect, vi } from 'vitest'
import { createHttp, redactUrl } from '@jobdekho/sources/http.js'

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

  // A thrown error's URL is stored in runs.source_results and printed to the
  // CI log, so a keyed adapter's credentials must never survive into it.
  it('redacts credentials out of the URL in a thrown error', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 400 }))
    const http = createHttp({ fetchImpl })
    const url = 'https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=abc123&app_key=secretvalue&what=dev'
    await expect(http(url)).rejects.toThrow(/app_id=REDACTED/)
    await expect(http(url)).rejects.toThrow(/app_key=REDACTED/)
    await expect(http(url)).rejects.not.toThrow(/abc123|secretvalue/)
  })

  // fetch itself can fail with the URL in its message, before any status.
  it('redacts credentials out of an error fetch itself throws', async () => {
    const url = 'https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=abc123&app_key=secretvalue'
    const fetchImpl = vi.fn(async (u) => { throw new TypeError(`Failed to parse URL from ${u}`) })
    const err = await createHttp({ fetchImpl })(url).catch((e) => e)
    expect(err.message).toBe('Failed to parse URL from https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=REDACTED&app_key=REDACTED')
    expect(err.cause).toBeUndefined()
  })

  // The response is gone once http throws, so a site's request to stay away
  // for a while has to travel on the error.
  it('keeps a Retry-After header on the error, and adds nothing without one', async () => {
    const headers = new Headers({ 'Retry-After': '120' })
    const told = await createHttp({ fetchImpl: async () => ({ ok: false, status: 429, headers }) })('https://x').catch((e) => e)
    expect(told.message).toBe('HTTP 429 for https://x')
    expect(told.retryAfter).toBe('120')
    const silent = await createHttp({ fetchImpl: async () => ({ ok: false, status: 429 }) })('https://x').catch((e) => e)
    expect(silent).not.toHaveProperty('retryAfter')
  })

  it('passes an error with nothing to redact through as it was', async () => {
    const abort = new DOMException('This operation was aborted', 'AbortError')
    const http = createHttp({ fetchImpl: vi.fn(async () => { throw abort }) })
    await expect(http('https://x/y?app_key=secret')).rejects.toBe(abort)
  })
})

describe('redactUrl', () => {
  it('redacts known credential-looking params case-insensitively', () => {
    const url = 'https://x/y?Token=abc&API_KEY=def&Secret=ghi&password=jkl&foo=bar'
    const out = redactUrl(url)
    expect(out).toContain('Token=REDACTED')
    expect(out).toContain('API_KEY=REDACTED')
    expect(out).toContain('Secret=REDACTED')
    expect(out).toContain('password=REDACTED')
    expect(out).toContain('foo=bar')
  })

  it('leaves a URL with no credential-looking params untouched', () => {
    expect(redactUrl('https://x/y?what=developer&page=1')).toBe('https://x/y?what=developer&page=1')
  })

  // "_" is a word character, so a \b-anchored pattern never matched these two,
  // which are the commonest spellings a keyed API uses.
  it('redacts a secret whose name is joined by an underscore', () => {
    expect(redactUrl('https://x/y?access_token=abc')).toBe('https://x/y?access_token=REDACTED')
    expect(redactUrl('https://x/y?client_secret=abc')).toBe('https://x/y?client_secret=REDACTED')
    expect(redactUrl('https://x/y?apiKey=abc')).toBe('https://x/y?apiKey=REDACTED')
  })

  // A bare substring test would redact both of these for containing "key" or
  // "id", losing the part of the error that says what was actually requested.
  it('keeps a param that merely contains a credential word', () => {
    expect(redactUrl('https://x/y?keywords=react&job_id=55')).toBe('https://x/y?keywords=react&job_id=55')
  })
})
