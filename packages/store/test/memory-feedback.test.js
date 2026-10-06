import { describe, it, expect } from 'vitest'
import { readFeedback, noteFeedback, forgetFeedback, MAX_FEEDBACK } from '@jobdekho/store/memory-feedback.js'

function memoryStore() {
  const data = new Map()
  return { memoryFeedback: { get: (id) => data.get(id) ?? null, set: (id, value) => data.set(id, value) } }
}

const AT = new Date('2026-10-06T12:00:00Z')

describe('the memory feedback log', () => {
  it('keeps each offer and what became of it, with when', () => {
    const store = memoryStore()
    expect(noteFeedback(store, 'u1', [{ text: 'Always tell me the pay', source: 'habit', topic: 'pay', outcome: 'offered' }], AT)).toBe(1)
    expect(readFeedback(store, 'u1')).toEqual([{ at: AT.toISOString(), source: 'habit', topic: 'pay', text: 'Always tell me the pay', outcome: 'offered' }])
  })

  // The log is built from what a request sent: anything malformed is
  // dropped rather than kept as it came.
  it('drops what is not an offer and its outcome, and reads an unknown source as the AI', () => {
    const store = memoryStore()
    expect(noteFeedback(store, 'u1', [{ text: '', outcome: 'saved' }, { text: 'x', outcome: 'maybe' }, null, { text: 'Keep it short', source: 'constructor', outcome: 'dismissed' }], AT)).toBe(1)
    expect(readFeedback(store, 'u1')).toEqual([expect.objectContaining({ source: 'ai', topic: null, outcome: 'dismissed' })])
  })

  it('keeps only the newest past the cap, and forgets it all on Forget everything', () => {
    const store = memoryStore()
    noteFeedback(store, 'u1', Array.from({ length: MAX_FEEDBACK + 5 }, (_, i) => ({ text: `Offer ${i}`, outcome: 'offered' })), AT)
    expect(readFeedback(store, 'u1')).toHaveLength(MAX_FEEDBACK)
    expect(readFeedback(store, 'u1')[0].text).toBe('Offer 5')
    forgetFeedback(store, 'u1')
    expect(readFeedback(store, 'u1')).toEqual([])
  })
})
