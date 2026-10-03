import { describe, it, expect, afterEach } from 'vitest'
import { createDocument } from '@jobdekho/store/documents.js'
import { historyBlock } from '@jobdekho/server/chat/prompt-history.js'
import { chatApp, answeringCli, posting, cleanUp } from './fixtures/chat-app.js'

afterEach(cleanUp)

const TEX = '\\documentclass{article}\n\\begin{document}\nPriya\n\\end{document}\n'

describe('historyBlock', () => {
  it('labels each line with what the chat held when it was asked, by name', () => {
    const names = new Map([['p1', 'Razorpay'], ['p2', 'Writesonic'], ['d1', 'Classic resume']])
    const turns = [
      { question: 'which pays more?', answer: 'Razorpay.', items: { jobs: ['p1', 'p2'], documents: ['d1'] } },
      { question: 'and the team?', answer: 'Small.', items: { jobs: ['p1'], documents: [] } },
      { question: 'thanks', answer: 'Welcome.', items: { jobs: [], documents: [] } },
      { question: 'from before chats', answer: 'Old.' },
      { question: 'about a job long gone', answer: 'Gone.', items: { jobs: ['gone'], documents: [] } },
    ]
    expect(historyBlock(turns, names)).toBe('Earlier in this conversation:\n'
      + '[Razorpay, Writesonic, Classic resume] Q: which pays more?\nA: Razorpay.\n'
      + '[Razorpay] Q: and the team?\nA: Small.\n'
      + 'Q: thanks\nA: Welcome.\n'
      + 'Q: from before chats\nA: Old.\n'
      + 'Q: about a job long gone\nA: Gone.\n\n')
  })
})

describe('the history a chat\'s question is asked with', () => {
  it('names the items each earlier question was asked about, as the comparison grew and shrank', async () => {
    const cli = answeringCli(() => ({ reply: 'Noted.' }))
    let docId = null
    const app = await chatApp({
      cli: cli.cli,
      postings: [posting('p1', 'Frontend Intern', 'Razorpay'), posting('p2', 'Writer', 'Writesonic'), posting('p3', 'Analyst', 'Zeta')],
      seed: async (store, userId) => { docId = (await createDocument(store, userId, { name: 'Classic resume', kind: 'resume', templateId: 'classic', tex: TEX, by: 'template' })).id },
    })
    const compare = await app.newChat({ kind: 'compare', jobs: ['p1', 'p2'] })
    const items = (body) => app.call('POST', `/api/chats/${compare.id}/items`, body)
    await app.ask(compare.id, 'which pays more?')
    await items({ action: 'add', type: 'job', id: 'p3' })
    await items({ action: 'add', type: 'document', id: docId })
    await app.ask(compare.id, 'and which is remote?')
    await items({ action: 'remove', type: 'job', id: 'p2' })
    await app.ask(compare.id, 'so, which one?')
    const last = cli.prompts().at(-1).input
    expect(last).toContain('[Razorpay, Writesonic] Q: which pays more?\nA: Noted.')
    expect(last).toContain('[Razorpay, Writesonic, Zeta, Classic resume] Q: and which is remote?\nA: Noted.')
    expect(last).toContain('Question: so, which one?')
    expect((await app.page(compare.id)).turns.map((t) => t.items)).toEqual([
      { jobs: ['p1', 'p2'], documents: [] },
      { jobs: ['p1', 'p2', 'p3'], documents: [docId] },
      { jobs: ['p1', 'p3'], documents: [docId] },
    ])
  })

  it('leaves out a note that a job action ran elsewhere: it was not a question', async () => {
    const cli = answeringCli(({ args }) => (args.includes('WebSearch,WebFetch') ? { verdict: 'genuine', summary: 'Real.', checks: [], redFlags: [] } : { reply: 'Noted.' }))
    const app = await chatApp({ cli: cli.cli, postings: [posting('p1', 'Frontend Intern', 'Razorpay'), posting('p2', 'Writer', 'Writesonic')] })
    const compare = await app.newChat({ kind: 'compare', jobs: ['p1', 'p2'] })
    await app.action('p1', 'fake-check', { chatId: compare.id })
    await app.ask(compare.id, 'which pays more?')
    const last = cli.prompts().at(-1).input
    expect(last).not.toContain('Earlier in this conversation')
    expect((await app.page(compare.id)).turns.map((t) => (t.note ? 'note' : t.question))).toEqual(['note', 'which pays more?'])
  })
})
