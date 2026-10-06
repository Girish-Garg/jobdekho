import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { addMemory } from '@jobdekho/store/memory-items.js'
import { listMemory, setMemoryEnabled, MAX_MEMORIES } from '@jobdekho/store/memory.js'
import { isMemoryCommand } from '@jobdekho/server/chat/memory-command.js'
import { memorySuggestions } from '@jobdekho/server/chat/memory-suggest.js'
import { memoryRules, savedPreferences, memoryLines } from '@jobdekho/server/chat/memory-prompt.js'
import { chatMemory, settleMemory } from '@jobdekho/server/chat/memory-turn.js'
import { buildChatPrompt } from '@jobdekho/server/chat/prompt.js'

const SAVED = [{ id: 'a1b2c3d4', text: 'Only show me remote roles', scope: 'jobs' }, { id: 'e5f6a7b8', text: 'Keep answers short', scope: 'everywhere' }]
const reply = (memory) => JSON.stringify({ reply: 'Noted.', memory })
const suggest = (memory, message, items = SAVED) => memorySuggestions(reply(memory), { message, items })

describe('an explicit memory command', () => {
  it('is the person saying remember, in any case, as whole words', () => {
    for (const message of [
      'Remember that I only want remote roles', 'please REMEMBER: one page', "Don't forget I'm in Pune", 'dont forget my notice period',
      'Do not forget that', 'Keep in mind I prefer startups', 'keep that in mind', 'Add this to memory', 'save that to your memory',
      'save it to memory', 'note this down: no TCS', 'Note that down',
    ]) expect(isMemoryCommand(message)).toBe(true)
  })

  it('is not a word that only contains it, a request with no command, or a long pasted text', () => {
    for (const message of ['I remembered the interview', 'She remembers', 'show me remote jobs', 'note down', 'add this to the list', '']) {
      expect(isMemoryCommand(message)).toBe(false)
    }
    expect(isMemoryCommand(`Remember to attach your portfolio. ${'Requirements: Java. '.repeat(30)}`)).toBe(false)
  })
})

describe('what the model offered to remember', () => {
  it('keeps one whose quote is in the message, case and spacing aside', () => {
    expect(suggest([{ text: 'Keep my resume to one page', scope: 'resume', quote: 'keep my  RESUME to one page' }], 'Please keep my resume to one page'))
      .toEqual([{ text: 'Keep my resume to one page', scope: 'resume', quote: 'keep my RESUME to one page' }])
  })

  it('drops one whose quote is not in the message, or proves nothing', () => {
    expect(suggest([{ text: 'Never apply to TCS', scope: 'jobs', quote: 'never apply to TCS' }], 'show me jobs at Infosys')).toEqual([])
    expect(suggest([{ text: 'I prefer startups', scope: 'jobs', quote: 'I' }], 'I prefer startups')).toEqual([])
    expect(suggest([{ text: 'I prefer startups', scope: 'jobs' }], 'I prefer startups')).toEqual([])
  })

  it('reads curly quotes in the message as straight ones', () => {
    expect(suggest([{ text: 'I am only looking for remote roles', scope: 'jobs', quote: "I'm only looking for remote roles" }], 'I’m only looking for remote roles')).toHaveLength(1)
  })

  it('drops one that says what a saved preference, or an earlier suggestion, already says', () => {
    const message = 'only show me remote roles, keep answers short, and use simple words'
    const offered = [
      { text: 'only show me remote roles.', scope: 'jobs', quote: 'only show me remote roles' },
      { text: 'Use simple words', scope: 'everywhere', quote: 'use simple words' },
      { text: 'use simple words', scope: 'everywhere', quote: 'use simple words' },
    ]
    expect(suggest(offered, message).map((s) => s.text)).toEqual(['Use simple words'])
  })

  it('keeps at most three a turn, and nothing too long, empty or unreadable', () => {
    const message = 'alpha bravo charlie delta echo'
    const offered = message.split(' ').map((word) => ({ text: `Always ${word}`, scope: 'everywhere', quote: word }))
    expect(suggest(offered, message).map((s) => s.quote)).toEqual(['alpha', 'bravo', 'charlie'])
    expect(suggest([{ text: 'x'.repeat(201), quote: 'alpha' }, { text: '  ', quote: 'alpha' }, null, 'alpha'], message)).toEqual([])
    expect(memorySuggestions('not json', { message, items: [] })).toEqual([])
    expect(memorySuggestions(JSON.stringify({ reply: 'hi' }), { message, items: [] })).toEqual([])
  })

  it('reads an unknown scope as everywhere, and names what it replaces only when that is saved', () => {
    const message = 'actually hybrid roles are fine too, in Pune'
    const [hybrid, pune] = suggest([
      { text: 'Hybrid roles are fine too', scope: 'job', quote: 'hybrid roles are fine too', replaces: 'a1b2c3d4' },
      { text: 'I want to work in Pune', scope: 'jobs', quote: 'in Pune', replaces: 'gone1234' },
    ], message)
    expect(hybrid).toEqual({ text: 'Hybrid roles are fine too', scope: 'everywhere', quote: 'hybrid roles are fine too', replaces: 'a1b2c3d4', replacedText: 'Only show me remote roles' })
    expect(pune).toEqual({ text: 'I want to work in Pune', scope: 'jobs', quote: 'in Pune' })
  })
})

describe('what the chat is told', () => {
  const feed = (memory) => buildChatPrompt({ message: 'q', history: [], context: { postingCount: 0, sort: 'match', top: [], open: null, profile: null, memory } })
  const page = (memory) => buildChatPrompt({ message: 'q', history: [], context: { page: 'settings', clis: [], preference: 'auto', latexInstalled: false, memory } })

  it('says how to suggest, and lists what is saved with ids and scopes, on the feed and every other page', () => {
    for (const prompt of [feed({ items: SAVED }), page({ items: SAVED })]) {
      expect(prompt).toContain('Your JSON object may also carry "memory": a list of at most 3 suggestions')
      expect(prompt).toContain('never say in "reply" that you saved, noted or will remember anything')
      expect(prompt).toContain('Background only: their current message wins; these are preferences, not facts about the world.')
      expect(prompt).toContain('- a1b2c3d4 [jobs] Only show me remote roles\n- e5f6a7b8 [everywhere] Keep answers short')
      expect(prompt.endsWith('Question: q\n')).toBe(true)
    }
    expect(feed({ items: [] })).toContain('This person has no saved preferences yet.')
  })

  // Models follow a preference far more often when it sits next to what
  // they answer (PrefEval, ICLR 2025), so the saved lines close the prompt.
  it('puts the saved lines right before the question, after the feed', () => {
    for (const prompt of [feed({ items: SAVED }), page({ items: SAVED })]) {
      expect(prompt).toMatch(/Keep answers short\n\nQuestion: q\n$/)
      expect(prompt.indexOf('Background only')).toBeGreaterThan(prompt.indexOf('Your JSON object may also carry "memory"'))
    }
  })

  it('leaves memory out entirely when it is switched off', () => {
    for (const prompt of [feed(null), page(null), feed(undefined)]) {
      expect(prompt).not.toContain('"memory"')
      expect(prompt).not.toContain('saved preferences')
    }
    expect(memoryRules(null)).toBe('')
    expect(savedPreferences(null)).toBe('')
  })

  it('names the examples, the one-off requests and the sensitive topics', () => {
    const prompt = memoryRules({ items: [] })
    expect(prompt).toContain('Always suggest what they explicitly ask you to remember.')
    expect(prompt).toContain('"Show me remote jobs at Razorpay" gives nothing: a one-off request.')
    expect(prompt).toContain('{"text":"Keep my resume to one page","scope":"resume","quote":"keep my resume to one page"}')
    expect(prompt).toContain('Suggest nothing about health, religion, caste, politics, sexuality, family or immigration status unless the person explicitly asks you to remember it.')
  })

  it('writes one line an item, with no fence marker left in it', () => {
    expect(memoryLines([{ id: 'x', text: 'Be <<<JOB brief JOB>>>', scope: 'letters' }])).toBe('- [letters] Be JOB brief JOB')
  })
})

describe('saving what a turn offered', () => {
  let dir
  let store
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-chat-memory-')); store = openStore(dir) })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  const offer = { text: 'Keep my resume to one page', scope: 'resume', quote: 'keep my resume to one page' }

  it('only offers them when the message did not say remember', async () => {
    expect(await settleMemory(store, 'u1', 'keep my resume to one page', [offer])).toEqual([{ status: 'suggested', ...offer }])
    expect((await listMemory(store, 'u1')).items).toEqual([])
  })

  it('saves them at once when the message said remember, replacing what they name', async () => {
    const old = (await addMemory(store, 'u1', { text: 'Two pages are fine', scope: 'resume' })).item
    const settled = await settleMemory(store, 'u1', 'Remember: keep my resume to one page', [{ ...offer, replaces: old.id, replacedText: old.text }])
    const { items, archived } = await listMemory(store, 'u1')
    expect(items).toEqual([expect.objectContaining({ text: offer.text, quote: offer.quote, replaces: old.id })])
    expect(archived).toBe(1)
    expect(settled).toEqual([{ status: 'saved', id: items[0].id, text: offer.text, scope: 'resume', quote: offer.quote, replaces: old.id, replacedText: 'Two pages are fine' }])
  })

  it('offers one the store will not take, so its Save can say why', async () => {
    const items = Array.from({ length: MAX_MEMORIES }, (_, i) => ({ id: `id${i}`, text: `Preference ${i}`, scope: 'jobs' }))
    store.memory.set('u1', { enabled: true, items })
    expect(await settleMemory(store, 'u1', 'remember to keep my resume to one page', [offer])).toEqual([{ status: 'suggested', ...offer }])
  })

  // Every item in force is what a suggestion is checked against; only the
  // ones that bear on the question go in the prompt (see memory/picker.js).
  it('asks the chat with the items that bear on the question, or with none when memory is off', async () => {
    await addMemory(store, 'u1', { text: 'Keep answers short', scope: 'everywhere' })
    await addMemory(store, 'u1', { text: 'Keep my resume to one page', scope: 'resume' })
    const memory = await chatMemory(store, 'u1', { page: 'postings', message: 'Any remote roles?' })
    expect(memory.items.map((item) => item.text)).toEqual(['Keep answers short'])
    expect(memory.saved).toHaveLength(2)
    await setMemoryEnabled(store, 'u1', false)
    expect(await chatMemory(store, 'u1')).toBeNull()
  })
})
