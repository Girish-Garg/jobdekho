import { describe, it, expect } from 'vitest'
import { validateQuestions } from '@jobdekho/server/chat/questions.js'
import { parseChatReply } from '@jobdekho/server/chat/parse.js'
import { historyBlock } from '@jobdekho/server/chat/prompt-history.js'
import { buildChatPrompt } from '@jobdekho/server/chat/prompt.js'

const FIT = {
  header: 'Fit',
  question: 'It runs to 2 pages. What should go?',
  options: [{ label: 'Achievements', description: 'Saves 3 lines' }, { label: 'Compact layout', description: 'Tighter spacing' }],
  multiSelect: true,
}

describe('validateQuestions', () => {
  it('keeps a question with its options, as plain one-line text', () => {
    expect(validateQuestions([FIT])).toEqual([FIT])
    const messy = { question: 'Which\n one?', options: ['First', { label: 'Second  one', description: 'x\ny' }] }
    expect(validateQuestions([messy])).toEqual([{
      header: 'Question', question: 'Which one?', options: [{ label: 'First', description: '' }, { label: 'Second one', description: 'x y' }], multiSelect: false,
    }])
  })

  it('drops a question with no text or fewer than two options to pick from, and repeated options', () => {
    expect(validateQuestions([{ question: 'Pick', options: ['Only', 'only'] }, { options: ['A', 'B'] }, null, 'Pick'])).toEqual([])
  })

  it('caps how many questions, options and characters reach the screen', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ question: `Q${i}`, options: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], header: 'A very long header indeed' }))
    const out = validateQuestions(many)
    expect(out).toHaveLength(3)
    expect(out[0].options).toHaveLength(5)
    expect(out[0].header).toBe('A very long he')
    expect(validateQuestions([{ question: 'x'.repeat(500), options: ['A', 'B'] }])[0].question).toHaveLength(240)
    expect(validateQuestions('ask')).toEqual([])
  })
})

describe('a chat reply that asks back', () => {
  it('carries its questions, and needs no more than a line of reply', () => {
    const parsed = parseChatReply(JSON.stringify({ reply: 'Two ways to fit it.', ask: [FIT] }), { page: 'resume' })
    expect(parsed.questions).toEqual([FIT])
    expect(parseChatReply(JSON.stringify({ ask: [FIT] }), { page: 'resume' }).reply).toBe('Pick below.')
    expect(parseChatReply(JSON.stringify({ reply: 'Hi.' }), { page: 'resume' }).questions).toEqual([])
  })

  it('shows the model what it asked, so the picks that follow read as answers', () => {
    const block = historyBlock([{ question: 'Fit it on one page', answer: 'Two ways.', questions: [FIT] }, { question: 'Achievements', answer: 'Done.' }])
    expect(block).toContain('A: Two ways.\n(Asked: "It runs to 2 pages. What should go?" [Achievements / Compact layout])')
  })

  it('is told how to ask on every page', () => {
    for (const page of ['postings', 'profile', 'resume', 'settings']) {
      const prompt = buildChatPrompt({ message: 'hi', context: { page }, history: [] })
      expect(prompt).toContain('"ask" beside "reply"')
      expect(prompt).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`))
    }
  })
})
