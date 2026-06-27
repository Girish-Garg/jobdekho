import { describe, it, expect } from 'vitest'
import { makeId } from '@jobdekho/core/posting.js'

describe('makeId', () => {
  it('is deterministic for the same inputs', () => {
    expect(makeId('greenhouse:stripe', '42')).toBe(makeId('greenhouse:stripe', '42'))
  })
  it('differs across sources for the same externalId', () => {
    expect(makeId('lever:x', '42')).not.toBe(makeId('greenhouse:x', '42'))
  })
  it('returns a 16-char hex string', () => {
    expect(makeId('s', '1')).toMatch(/^[0-9a-f]{16}$/)
  })
})
