import { describe, it, expect, afterEach } from 'vitest'
import { createChat } from '@jobdekho/store/chats.js'
import { upsertProfile } from '@jobdekho/store/profiles.js'
import { listDocuments, getDocument } from '@jobdekho/store/documents.js'
import { getAiResult } from '@jobdekho/store/ai-results.js'
import { readNdjson, NDJSON_TYPE } from '@jobdekho/server/ai/events.js'
import { chatApp, answeringCli, posting, cleanUp } from './fixtures/chat-app.js'
import { PROFILE, PLAN } from './fixtures/tailored-resume.js'

afterEach(cleanUp)

const letterFor = (company) => ({ letter: `Dear Hiring Team at ${company},\n\nI built the onboarding portal.\n\nRegards`, usedFromResume: [], notClaimed: [] })
const ACME = posting('p1', 'Frontend Intern', 'Acme')
const WRITESONIC = posting('p2', 'Writer', 'Writesonic')

// The tailoring's plan, a letter naming the company asked about, and
// `unreadable` for the companies whose letter comes back as no letter.
const answers = (unreadable = []) => ({ input }) => {
  if (input.includes('You are tailoring')) return PLAN
  const company = ['Acme', 'Writesonic', 'Zeta'].find((name) => input.includes(`company: ${name}`))
  return unreadable.includes(company) ? 'I would rather not.' : letterFor(company)
}

async function setup({ cli = answeringCli(answers()), profile = PROFILE, jobs = ['p1', 'p2'], postings = [ACME, WRITESONIC] } = {}) {
  const made = {}
  const chats = await chatApp({
    cli: cli.cli, postings,
    seed: async (store, userId) => {
      await upsertProfile(store, userId, { ...profile, resumeText: 'PRIYA SHARMA RESUME', resumeName: 'cv.pdf' })
      made.compare = (await createChat(store, userId, { kind: 'compare', jobs, title: 'Acme vs Writesonic' })).chat
      made.general = (await createChat(store, userId, { kind: 'general', title: 'New chat' })).chat
    },
  })
  return { ...chats, ...cli, ...made, run: (what, headers) => chats.call('POST', `/api/chats/${made.compare.id}/${what}`, undefined, headers) }
}

describe('POST /api/chats/:id/tailor-all', () => {
  it('makes one resume for what the jobs share, on the Resume page, with its card in the comparison', async () => {
    const app = await setup()
    const res = await app.run('tailor-all')
    expect(res.statusCode).toBe(200)
    const turn = res.json()
    expect(turn).toMatchObject({
      chatId: app.compare.id, question: 'Tailor resume for all', provider: 'claude',
      answer: 'Made "Tailored for Acme + Writesonic" from your career record, aimed at what these jobs share. It is on the Resume page.',
      combined: { kind: 'tailor-all', name: 'Tailored for Acme + Writesonic', jobs: ['p1', 'p2'], keywords: { used: expect.any(Array) } },
      items: { jobs: ['p1', 'p2'], documents: [] },
    })
    const [prompt, ...more] = app.prompts()
    expect(more).toEqual([])
    expect(prompt.args).toEqual(expect.arrayContaining(['--tools', '']))
    expect(prompt.input).toContain('Frontend Intern at Acme:')
    expect(prompt.input).toContain('Writer at Writesonic:')
    expect(prompt.input).toContain('not one job but 2 jobs')
    const doc = await getDocument(app.store, app.userId, turn.combined.documentId)
    expect(doc).toMatchObject({ name: 'Tailored for Acme + Writesonic', kind: 'resume', templateId: 'classic', postingId: null })
    expect(doc.versions.map((v) => v.by)).toEqual(['ai'])
    expect(doc.tex).toContain('Priya Sharma')
    const { chatId, ...card } = turn
    expect((await app.page(app.compare.id)).turns).toEqual([card])
    const made = (await app.call('GET', '/api/chat/made-by-ai')).json().items
    expect(made).toContainEqual(expect.objectContaining({ kind: 'document', documentId: doc.id }))
  })

  it('refuses what is not a comparison, a record with nothing to tailor from, and too few jobs still listed', async () => {
    const app = await setup()
    expect((await app.call('POST', `/api/chats/${app.general.id}/tailor-all`)).json()).toEqual({ error: 'This works on a comparison of jobs.' })
    expect((await app.call('POST', '/api/chats/nope/tailor-all')).statusCode).toBe(404)
    const empty = await setup({ profile: { basics: { name: 'Priya' } } })
    expect((await empty.run('tailor-all')).json()).toEqual({ error: 'Add at least one entry to your career record first.' })
    const gone = await setup({ jobs: ['p1', 'gone'] })
    expect((await gone.run('tailor-all')).json()).toEqual({ error: 'Only 1 of these jobs is still listed, which is too few for this.' })
    expect(app.prompts()).toEqual([])
  })

  it('fails as the AI did, saving nothing, and keeps the failure in the comparison', async () => {
    const app = await setup({ cli: answeringCli(() => 'not a plan') })
    const res = await app.run('tailor-all')
    expect(res.statusCode).toBe(422)
    expect(await listDocuments(app.store, app.userId)).toEqual([])
    expect((await app.pending()).failed[app.compare.id]).toMatchObject({ kind: 'combined', label: 'Tailor resume for all' })
  })
})

describe('POST /api/chats/:id/letters-each', () => {
  it('writes one letter per job in turn, each saved with its job in that job\'s chat, and lists them on one card', async () => {
    const app = await setup()
    const res = await app.run('letters-each', { accept: NDJSON_TYPE })
    const { events, result } = readNdjson(res.body)
    const steps = events.filter((e) => e.stage === 'letter' || e.event === 'start').map((e) => e.label ?? e.event)
    expect(steps).toEqual(['Cover letter 1 of 2', 'start', 'Cover letter 2 of 2', 'start'])
    expect(events.find((e) => e.stage === 'letter')).toEqual({ event: 'progress', stage: 'letter', index: 1, total: 2, postingId: 'p1', label: 'Cover letter 1 of 2' })
    const own = {}
    for (const id of ['p1', 'p2']) own[id] = (await app.call('GET', `/api/chats/for-job/${id}`)).json()
    expect(result).toMatchObject({
      chatId: app.compare.id, question: 'Cover letter for each', answer: 'Wrote 2 cover letters, each saved with its job, in that job\'s chat.',
      combined: { kind: 'letters-each', letters: [
        { postingId: 'p1', title: 'Frontend Intern', company: 'Acme', status: 'written', chatId: own.p1.chat.id },
        { postingId: 'p2', title: 'Writer', company: 'Writesonic', status: 'written', chatId: own.p2.chat.id },
      ] },
    })
    expect(app.prompts().map((p) => /company: (\w+)/.exec(p.input)[1])).toEqual(['Acme', 'Writesonic'])
    expect(own.p1.results).toEqual([expect.objectContaining({ kind: 'cover-letter', versions: [expect.objectContaining({ chatId: own.p1.chat.id })] })])
    expect(own.p1.chat.unseen).toBe(true)
    expect((await getAiResult(app.store, app.userId, 'p2', 'cover-letter')).result.letter).toContain('Writesonic')
    const compare = await app.page(app.compare.id)
    expect(compare.results).toEqual([])
    expect(compare.turns.map((t) => t.combined.kind)).toEqual(['letters-each'])
  })

  it('goes on past a letter that fails, and says which on the card', async () => {
    const app = await setup({ cli: answeringCli(answers(['Acme'])) })
    const turn = (await app.run('letters-each')).json()
    expect(turn.combined.letters.map((l) => l.status)).toEqual(['failed', 'written'])
    expect(turn.combined.letters[0].error).toMatch(/not in the shape JobDekho expected/)
    expect(turn.answer).toBe('Wrote 1 of 2 cover letters, each saved with its job, in that job\'s chat. The card says what stopped the rest.')
  })

  it('fails as the AI did when no letter was written, skips a job no longer listed, and needs a resume', async () => {
    const none = await setup({ cli: answeringCli(answers(['Acme', 'Writesonic'])) })
    const res = await none.run('letters-each')
    expect(res.statusCode).toBe(422)
    expect((await none.page(none.compare.id)).turns).toEqual([])
    const gone = await setup({ jobs: ['p1', 'gone'] })
    const turn = (await gone.run('letters-each')).json()
    expect(turn.combined.letters).toEqual([
      expect.objectContaining({ postingId: 'p1', status: 'written' }),
      { postingId: 'gone', title: null, company: null, status: 'skipped', error: 'JobDekho no longer lists this job.' },
    ])
    const noResume = await setup()
    await upsertProfile(noResume.store, noResume.userId, { ...PROFILE, resumeText: null, resumeName: null })
    expect((await noResume.run('letters-each')).json()).toEqual({ error: 'Upload a resume first.' })
  })
})
