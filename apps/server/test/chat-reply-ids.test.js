import { describe, it, expect } from 'vitest'
import { withoutPostingIds } from '@jobdekho/server/chat/reply-ids.js'
import { parseChatReply } from '@jobdekho/server/chat/parse.js'

const DASH = String.fromCharCode(0x2013)
const context = { top: [{ id: '7218f734fa01cd5a', title: 'Full Stack Developer', company: 'WELTEC' }, { id: 'c228d27abce967a2', title: 'React Native', company: 'PhonePe' }] }

describe('withoutPostingIds', () => {
  // As a 9B model through Ollama wrote it.
  it('takes a known id out of the prose, with the "id" and the dash that joined it', () => {
    const text = `1. id 7218f734fa01cd5a ${DASH} (FastAPI, Python & React) Full Stack Developer at WELTEC`
    expect(withoutPostingIds(text, context)).toBe('1. (FastAPI, Python & React) Full Stack Developer at WELTEC')
  })

  it('handles the other ways an id gets written in', () => {
    expect(withoutPostingIds('See (c228d27abce967a2) for the React role.', context)).toBe('See for the React role.')
    expect(withoutPostingIds('ID: c228d27abce967a2: React Native at PhonePe', context)).toBe('React Native at PhonePe')
  })

  it('leaves a run of hex the context does not hold as written', () => {
    expect(withoutPostingIds('commit 0123456789abcdef fixed it', context)).toBe('commit 0123456789abcdef fixed it')
    expect(withoutPostingIds('id 7218f734fa01cd5a', {})).toBe('id 7218f734fa01cd5a')
  })
})

describe('parseChatReply', () => {
  it('shows the answer without the ids, and keeps them as refs', () => {
    const raw = JSON.stringify({ reply: `Best is id c228d27abce967a2 ${DASH} React Native.`, refs: ['c228d27abce967a2'] })
    const parsed = parseChatReply(raw, context)
    expect(parsed.reply).toBe('Best is React Native.')
    expect(parsed.refs.map((ref) => ref.id)).toEqual(['c228d27abce967a2'])
  })
})
