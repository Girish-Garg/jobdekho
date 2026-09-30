import { describe, it, expect } from 'vitest'
import { interleave, groupOf } from '../src/interleave.js'
import { retryable } from '../src/retry.js'

const named = (...names) => names.map((name) => ({ name }))

describe('interleave', () => {
  it('takes one source from each platform in turn', () => {
    const adapters = named('greenhouse:a', 'greenhouse:b', 'lever:a', 'greenhouse:c', 'internshala')
    expect(interleave(adapters)).toEqual([0, 2, 4, 1, 3])
  })

  it('groups by the host an adapter names, before its platform', () => {
    expect(groupOf({ name: 'workday:nvidia', hostKey: 'workday:wd5' })).toBe('workday:wd5')
    expect(groupOf({ name: 'lever:paytm' })).toBe('lever')
    const adapters = [{ name: 'workday:a', hostKey: 'workday:wd1' }, { name: 'workday:b', hostKey: 'workday:wd1' }, { name: 'workday:c', hostKey: 'workday:wd5' }]
    expect(interleave(adapters)).toEqual([0, 2, 1])
  })

  it('returns nothing for nothing', () => {
    expect(interleave([])).toEqual([])
  })
})

describe('retryable', () => {
  it('tries again after no answer or a server error only', () => {
    expect(retryable(new Error('fetch failed'))).toBe(true)
    expect(retryable(new Error('This operation was aborted'))).toBe(true)
    expect(retryable(new Error('HTTP 502 for https://x'))).toBe(true)
    expect(retryable(new Error('HTTP 404 for https://x'))).toBe(false)
    expect(retryable(new Error('HTTP 422 for https://x'))).toBe(false)
    expect(retryable(new Error('HTTP 429 for https://x (not sent: this host refused earlier in the run)'))).toBe(false)
    expect(retryable(new Error('LinkedIn refused (HTTP 999); stopped at once with 0 postings'))).toBe(false)
    expect(retryable(new Error('apple stopped: the careers site answered 429'))).toBe(false)
  })
})
