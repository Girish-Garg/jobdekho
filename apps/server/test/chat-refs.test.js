import { describe, it, expect } from 'vitest'
import { validateRefs } from '@jobdekho/server/chat/refs.js'
import { parseChatReply } from '@jobdekho/server/chat/parse.js'

const top = [
  { id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 },
  { id: 'p2', title: 'Backend Engineer', company: 'Globex', fit: 71 },
]
const open = { id: 'p9', title: 'Staff Engineer', company: 'Initech' }

describe('validateRefs', () => {
  it('keeps ids the prompt carried, in the order the model named them, worded from the store row', () => {
    expect(validateRefs(['p2', 'p1'], { top, open: null })).toEqual([
      { id: 'p2', title: 'Backend Engineer', company: 'Globex', fit: 71 },
      { id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 },
    ])
  })

  it('drops an id that was not in the context, however plausible it looks', () => {
    expect(validateRefs(['p1', 'p3', 'c228d27abce967a2'], { top, open: null }).map((r) => r.id)).toEqual(['p1'])
  })

  it('accepts the scoped posting even when it is not among the top rows, with no fit to show', () => {
    expect(validateRefs(['p9'], { top, open })).toEqual([{ id: 'p9', title: 'Staff Engineer', company: 'Initech', fit: null }])
  })

  it('never takes the words from the model: a ref is only an id', () => {
    const refs = validateRefs([{ id: 'p1', title: 'Invented' }, 'p1'], { top, open: null })
    expect(refs).toEqual([{ id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 }])
  })

  it('drops duplicates and anything that is not a list', () => {
    expect(validateRefs(['p1', 'p1'], { top, open: null })).toHaveLength(1)
    expect(validateRefs('p1', { top, open: null })).toEqual([])
    expect(validateRefs(undefined, { top, open: null })).toEqual([])
  })

  it('caps how many chips one answer can carry', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, title: `Job ${i}`, company: 'Acme', fit: 50 }))
    expect(validateRefs(many.map((r) => r.id), { top: many, open: null })).toHaveLength(6)
  })
})

describe('parseChatReply refs', () => {
  it('validates the refs against the context it is given', () => {
    const raw = JSON.stringify({ reply: 'Try Acme.', refs: ['p1', 'nope'] })
    expect(parseChatReply(raw, { top, open: null }).refs).toEqual([{ id: 'p1', title: 'Frontend Intern', company: 'Acme', fit: 55 }])
  })

  it('reads a reply with no refs at all as naming nothing', () => {
    expect(parseChatReply(JSON.stringify({ reply: 'Hello.' }), { top, open: null }).refs).toEqual([])
  })
})
