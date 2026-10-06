import { describe, it, expect } from 'vitest'
import { spotPhrases } from '@jobdekho/server/memory/phrases.js'
import { rememberedLine } from '@jobdekho/server/memory/remember.js'
import { spotHabit, questionsFrom } from '@jobdekho/server/memory/habits.js'
import { spotMemory } from '@jobdekho/server/memory/spot.js'

const NOW = Date.parse('2026-10-06T12:00:00Z')
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString()

describe('spotPhrases', () => {
  it('offers a lasting preference in the person own words, trimmed, with where it applies', () => {
    expect(spotPhrases('From now on only show me remote roles')).toEqual([{ text: 'Only show me remote roles', scope: 'jobs', quote: 'From now on only show me remote roles', source: 'phrase' }])
    expect(spotPhrases('Ok, I prefer startups over big companies.')[0]).toMatchObject({ text: 'I prefer startups over big companies', scope: 'jobs' })
    expect(spotPhrases('Always keep my resume to one page')[0]).toMatchObject({ scope: 'resume' })
    expect(spotPhrases("I'm a fresher, so keep answers simple")[0]).toMatchObject({ scope: 'jobs' })
  })

  it('leaves questions, one-offs and sensitive topics alone', () => {
    expect(spotPhrases('Will you always show the pay?')).toEqual([])
    expect(spotPhrases('Show me remote jobs at Razorpay')).toEqual([])
    expect(spotPhrases('I never want my H1B visa mentioned')).toEqual([])
  })
})

describe('rememberedLine', () => {
  it('reads what to keep after the command or before it', () => {
    expect(rememberedLine("Remember that I'm only looking for remote roles")).toMatchObject({ text: "I'm only looking for remote roles", scope: 'jobs', source: 'remember' })
    expect(rememberedLine('I only want product companies, remember that')).toMatchObject({ text: 'I only want product companies' })
    expect(rememberedLine("Don't forget: my notice period is 30 days")).toMatchObject({ text: 'My notice period is 30 days' })
  })

  it('has nothing to keep for a bare "remember this"', () => {
    expect(rememberedLine('Remember this')).toBeNull()
  })

  // "Remember to..." asks for something now, unless it says always or never.
  it('keeps a "remember to" only when it says something lasting', () => {
    expect(rememberedLine('Remember to show me jobs at Infosys')).toBeNull()
    expect(rememberedLine('Remember to always show the pay')).toMatchObject({ text: 'Always show the pay', scope: 'jobs' })
  })
})

describe('spotHabit', () => {
  const pay = [{ chatId: 'a', text: 'What is the salary here?', at: daysAgo(1) }, { chatId: 'b', text: 'Does Razorpay pay well?', at: daysAgo(3) }]

  // The owner's example: asking about pay again and again, never saying
  // "always tell me the pay".
  it('offers a topic asked about again and again, across chats, with the reason', () => {
    expect(spotHabit({ message: 'How much is the stipend?', chatId: 'c', past: pay, now: NOW })).toEqual({
      text: 'Always tell me the pay when we talk about a job', scope: 'jobs', quote: 'How much is the stipend?', source: 'habit', topic: 'pay',
      why: "You've asked about pay 3 times lately.",
    })
  })

  it('waits for enough mentions, recent enough, in more than one chat or day', () => {
    expect(spotHabit({ message: 'What is the stipend?', chatId: 'c', past: pay.slice(0, 1), now: NOW })).toBeNull()
    expect(spotHabit({ message: 'What is the stipend?', chatId: 'c', past: pay.map((p) => ({ ...p, at: daysAgo(90) })), now: NOW })).toBeNull()
    const sameChat = pay.map((p) => ({ ...p, chatId: 'c', at: new Date(NOW).toISOString() }))
    expect(spotHabit({ message: 'What is the stipend?', chatId: 'c', past: sameChat, now: NOW })).toBeNull()
  })

  it('stays quiet when a memory covers it, after a Not now, and while an offer waits', () => {
    const ask = (extra) => spotHabit({ message: 'What is the stipend?', chatId: 'c', past: pay, now: NOW, ...extra })
    expect(ask({ saved: [{ text: 'Always show me the salary' }] })).toBeNull()
    expect(ask({ feedback: [{ source: 'habit', topic: 'pay', outcome: 'dismissed', at: daysAgo(10) }] })).toBeNull()
    expect(ask({ feedback: [{ source: 'habit', topic: 'pay', outcome: 'dismissed', at: daysAgo(40) }] })).not.toBeNull()
    expect(ask({ feedback: [1, 2].map((n) => ({ source: 'habit', topic: 'pay', outcome: 'dismissed', at: daysAgo(100 + n) })) })).toBeNull()
    expect(ask({ feedback: [{ source: 'habit', topic: 'pay', outcome: 'offered', at: daysAgo(1) }] })).toBeNull()
  })

  it('never offers from a sensitive question', () => {
    expect(spotHabit({ message: 'What does the H1B visa job pay?', chatId: 'c', past: pay, now: NOW })).toBeNull()
  })

  // Only the person's own questions count: never a job action's note or a
  // combined card, so nothing a posting says can plant a habit.
  it('counts only the questions the person asked', () => {
    const all = { a: { turns: [{ question: 'pay?', createdAt: 'x' }, { question: 'note', note: true }, { combined: 'tailor-all' }] } }
    expect(questionsFrom(all)).toEqual([{ chatId: 'a', text: 'pay?', at: 'x' }])
  })
})

describe('spotMemory', () => {
  it('puts the AI offer first and drops a phrase offer drawn from the same words', () => {
    const offered = [{ text: 'Only show me remote roles', scope: 'jobs', quote: 'only show me remote roles' }]
    const out = spotMemory({ message: 'From now on only show me remote roles', offered })
    expect(out).toEqual([{ ...offered[0], source: 'ai' }])
  })

  it('keeps an explicit remember when nothing else was offered, and never one already saved', () => {
    expect(spotMemory({ message: 'Remember that my notice period is 30 days' })[0]).toMatchObject({ source: 'remember', text: 'My notice period is 30 days' })
    expect(spotMemory({ message: 'Remember that my notice period is 30 days', saved: [{ text: 'my notice period is 30 days.' }] })).toEqual([])
  })
})
