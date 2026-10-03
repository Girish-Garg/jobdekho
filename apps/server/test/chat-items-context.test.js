import { describe, it, expect, vi } from 'vitest'
import { chatItemsContext } from '@jobdekho/server/chat/chat-items-context.js'
import { assembleThreadContext } from '@jobdekho/server/chat/thread-context.js'

const POSTINGS = {
  p9: {
    id: 'p9', title: 'Staff Engineer', company: 'Acme', location: 'Pune', level: 'staff', workMode: 'remote',
    stipend: 'Rs 30 LPA', degreeMin: 'bachelors', degreeRequired: true, duration: null, experience: '5+ years',
    source: 'linkedin', postedAt: '2026-09-01T00:00:00.000Z', status: 'saved', legitimacy: 'high',
    ghostSignals: [], descriptionText: 'x'.repeat(5000),
  },
  r1: { id: 'r1', title: 'Backend Engineer', company: 'Razorpay', ghostSignals: [], closedAt: '2026-09-20T00:00:00.000Z' },
  b1: { id: 'b1', title: 'Engineer', company: 'ACME FOUNDATION PVT LTD', ghostSignals: [] },
  w1: { id: 'w1', title: 'Writer', company: 'Writesonic', ghostSignals: [] },
}
const SAVED = [
  { kind: 'fake-check', postingId: 'p9', result: { verdict: 'likely_scam', summary: 'No office.', stillOpen: false, redFlags: ['asks for a fee'] } },
  { kind: 'cover-letter', postingId: 'p9', result: { letter: 'Dear team,' } },
]
const DOCS = [
  { id: 'd1', name: 'Classic resume', kind: 'resume', postingId: 'w1', tex: 'T'.repeat(50000), versions: [{ at: '2026-09-02T00:00:00.000Z', by: 'template' }], createdAt: '2026-09-02T00:00:00.000Z', updatedAt: '2026-09-02T00:00:00.000Z' },
  { id: 'd2', name: 'Letter', kind: 'cover-letter', postingId: null, tex: 'Dear', versions: [{ at: '2026-09-03T00:00:00.000Z', by: 'ai' }], createdAt: '2026-09-03T00:00:00.000Z', updatedAt: '2026-09-03T00:00:00.000Z' },
]

function fakes() {
  const dashboard = {
    getPosting: vi.fn(async (_u, id) => POSTINGS[id] ?? null),
    listAiResults: vi.fn(async (_u, id) => SAVED.filter((r) => r.postingId === id)),
    listBlockedCompanies: vi.fn(async () => [{ key: 'acmefoundation', name: 'Acme Foundation' }]),
    getProfile: vi.fn(async () => ({ skills: ['go'] })),
    listPostingsForUser: vi.fn(async () => [POSTINGS.p9]),
    listCompanies: vi.fn(async () => []),
  }
  const documents = { documents: { get: () => ({ documents: DOCS }), set: vi.fn() } }
  return { dashboard, documents }
}

const chat = (over) => ({ id: 'c1', kind: 'compare', jobs: [], documents: [], title: 't', ...over })

describe('what a chat holds, as its question is asked with it', () => {
  it('carries each job whole, trimmed as the pane shows it, with the newest of each saved answer', async () => {
    const { dashboard, documents } = fakes()
    const { chatJobs } = await chatItemsContext({ chat: chat({ jobs: ['p9', 'r1'] }), dashboard, documents, userId: 'u1' })
    expect(chatJobs[0]).toMatchObject({ id: 'p9', title: 'Staff Engineer', listed: true, savedAiAnswers: {
      'fake-check': { verdict: 'likely_scam', summary: 'No office.', stillOpen: false, redFlags: ['asks for a fee'] },
      'cover-letter': { letter: 'Dear team,' },
    } })
    expect(chatJobs[0].description).toHaveLength(4000)
    // A board closed it, but its chat can still talk about what it was.
    expect(chatJobs[1]).toMatchObject({ id: 'r1', title: 'Backend Engineer', listed: false, savedAiAnswers: null })
  })

  it('keeps only the id of a job the corpus dropped or whose company is blocked, saved answers and all', async () => {
    const { dashboard, documents } = fakes()
    const { chatJobs } = await chatItemsContext({ chat: chat({ jobs: ['gone', 'b1'] }), dashboard, documents, userId: 'u1' })
    expect(chatJobs).toEqual([{ id: 'gone', listed: false }, { id: 'b1', listed: false }])
    expect(dashboard.listAiResults).not.toHaveBeenCalled()
  })

  it('carries each document\'s source, cut past its limit and marked so, and skips one since deleted', async () => {
    const { dashboard, documents } = fakes()
    const { chatDocuments } = await chatItemsContext({ chat: chat({ kind: 'general', documents: ['d1', 'nope', 'd2'] }), dashboard, documents, userId: 'u1' })
    expect(chatDocuments.map((d) => [d.id, d.truncated, d.tex.length])).toEqual([['d1', true, 40000], ['d2', false, 4]])
    expect(chatDocuments[1]).toEqual({ id: 'd2', name: 'Letter', kind: 'cover-letter', truncated: false, baseAt: '2026-09-03T00:00:00.000Z', tex: 'Dear' })
  })

  it('gives a document\'s own chat the job its document was made for', async () => {
    const { dashboard, documents } = fakes()
    const { chatJobs } = await chatItemsContext({ chat: chat({ kind: 'document', documents: ['d1'] }), dashboard, documents, userId: 'u1' })
    expect(chatJobs.map((j) => j.id)).toEqual(['w1'])
  })

  it('names what earlier turns held, the chat\'s own items first, then any since removed', async () => {
    const { dashboard, documents } = fakes()
    const history = [{ question: 'q', answer: 'a', items: { jobs: ['w1', 'p9'], documents: ['d2'] } }]
    const { itemNames } = await chatItemsContext({ chat: chat({ jobs: ['p9', 'r1'] }), history, dashboard, documents, userId: 'u1' })
    expect(Object.fromEntries(itemNames)).toEqual({ p9: 'Acme', r1: 'Razorpay', w1: 'Writesonic', d2: 'Letter' })
  })
})

describe('the context a chat\'s question is asked with', () => {
  it('shows the feed to a general chat alone', async () => {
    const { dashboard, documents } = fakes()
    const general = await assembleThreadContext({ chat: chat({ kind: 'general' }), dashboard, documents, userId: 'u1', body: { filters: {}, sort: 'newest' } })
    expect(general).toMatchObject({ page: 'postings', chatKind: 'general', postingCount: 1, sort: 'newest', chatJobs: [], blocked: ['Acme Foundation'] })
    const job = await assembleThreadContext({ chat: chat({ kind: 'job', jobs: ['p9'] }), dashboard, documents, userId: 'u1', body: { filters: {}, sort: 'newest' } })
    expect(job).not.toHaveProperty('top')
    expect(job).not.toHaveProperty('postingCount')
    expect(job).toMatchObject({ chatKind: 'job', profile: { skills: ['go'] }, blocked: ['Acme Foundation'], chatJobs: [{ id: 'p9' }] })
    expect(dashboard.listPostingsForUser).toHaveBeenCalledTimes(1)
  })

  it('reads the page it was asked from as the chat always did, with the chat\'s items beside it', async () => {
    const { dashboard, documents } = fakes()
    dashboard.getResumeText = vi.fn(async () => 'RESUME')
    const profile = await assembleThreadContext({ chat: chat({ kind: 'job', jobs: ['p9'] }), dashboard, documents, userId: 'u1', body: { page: 'profile' } })
    expect(profile).toMatchObject({ page: 'profile', record: { skills: ['go'] }, resumeText: 'RESUME', chatJobs: [{ id: 'p9' }] })
  })
})
