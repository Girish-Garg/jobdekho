import { describe, it, expect } from 'vitest'
import { logoUrl, LOGO_HOSTS } from '@jobdekho/core/logo.js'
import { normalize } from '@jobdekho/core/normalize.js'

// A logo address is scraped text, and the server fetches it, so only https
// addresses on the hosts the sources really serve logos from are kept.
describe('logoUrl', () => {
  it('keeps an https logo on a known host', () => {
    for (const host of LOGO_HOSTS) expect(logoUrl(`https://${host}/a/logo.png`)).toBe(`https://${host}/a/logo.png`)
  })

  it('drops plain http, other hosts and this computer', () => {
    expect(logoUrl('http://media.licdn.com/logo.png')).toBeNull()
    expect(logoUrl('https://example.com/logo.png')).toBeNull()
    expect(logoUrl('https://127.0.0.1/logo.png')).toBeNull()
    expect(logoUrl('https://localhost:3000/api/profile')).toBeNull()
    expect(logoUrl('https://media.licdn.com.evil.example/logo.png')).toBeNull()
  })

  it('drops what is not an address at all', () => {
    expect(logoUrl('not a url')).toBeNull()
    expect(logoUrl(null)).toBeNull()
    expect(logoUrl('')).toBeNull()
  })

  it('rides through normalize, filtered the same way', () => {
    const raw = { externalId: '1', title: 'T', company: 'C' }
    expect(normalize({ ...raw, logoUrl: 'https://media.instahyre.com/x.webp' }, 's').logoUrl).toBe('https://media.instahyre.com/x.webp')
    expect(normalize({ ...raw, logoUrl: 'https://evil.example/x.png' }, 's').logoUrl).toBeNull()
    expect(normalize(raw, 's').logoUrl).toBeNull()
  })
})
