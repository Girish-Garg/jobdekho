import { describe, it, expect } from 'vitest'
import { parseJsonObject } from '@jobdekho/server/ai/loose-json.js'

describe('parseJsonObject', () => {
  it('digs the object out of prose and fences', () => {
    expect(parseJsonObject('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })

  // Prose after the object that holds a brace of its own used to make the
  // whole span unparseable.
  it('reads the object when prose after it holds a brace', () => {
    expect(parseJsonObject('{"reply":"ok","sources":[]}\n\nNote: searched for {razorpay careers}.')).toEqual({ reply: 'ok', sources: [] })
  })

  it('is null for no object, or one that never parses', () => {
    expect(parseJsonObject('plain words')).toBeNull()
    expect(parseJsonObject('{"reply": "unterminated}')).toBeNull()
    expect(parseJsonObject(null)).toBeNull()
  })
})
