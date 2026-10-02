import { describe, it, expect } from 'vitest'
import { companyKey, compactKey } from '@jobdekho/core/company-key.js'

// The spaced key is the company filter's (its tests sit with the chat's use
// of it, apps/server/test/company-key.test.js); the run-together one is what
// a block is kept under, so it has to meet a slug as well.
describe('compactKey', () => {
  it('meets a slug that runs the words together', () => {
    expect(compactKey('Western Digital')).toBe('westerndigital')
    expect(compactKey('WesternDigital')).toBe('westerndigital')
    expect(compactKey('Grafana Labs')).toBe(compactKey('grafanalabs'))
    expect(compactKey('PhonePeLimited')).toBe(compactKey('PHONEPE LIMITED'))
    expect(compactKey('razorpaysoftwareprivatelimited')).toBe(compactKey('Razorpay Software Private Limited'))
  })

  it('is the spaced key with its spaces dropped, and empty for a name with nothing to key', () => {
    expect(compactKey('Amazon Web Services, Inc.')).toBe(companyKey('Amazon Web Services, Inc.').replaceAll(' ', ''))
    expect(compactKey(' .,; ')).toBe('')
    expect(compactKey(undefined)).toBe('')
  })

  it('still tells different companies apart', () => {
    expect(compactKey('Grafana')).not.toBe(compactKey('Grafana Labs'))
    expect(compactKey('Acme Tech')).not.toBe(compactKey('Acme'))
  })
})
