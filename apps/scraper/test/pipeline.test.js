import { describe, it, expect, vi } from 'vitest'
import { makeId } from '@jobdekho/core/posting.js'
import { runPipeline } from '../src/pipeline.js'

const rules = {
  includeKeywords: ['software'], excludeKeywords: [], locations: ['remote'], internshipOnly: true,
}
const items = [
  { source: 's', raw: { externalId: '1', title: 'Software Intern', company: 'A', url: 'u1', location: 'Remote' } },
  { source: 's', raw: { externalId: '2', title: 'Chef', company: 'B', url: 'u2', location: 'Remote' } },
]

describe('runPipeline', () => {
  it('filters against the relevance rules, dedupes, and persists only fresh', async () => {
    const ports = {
      getExistingIds: vi.fn(async () => new Set()),
      upsertPostings: vi.fn(async () => {}),
      recordRun: vi.fn(async () => {}),
    }
    const out = await runPipeline({ items, results: [] }, { db: {}, rules, runId: 'r1', ports })
    expect(out).toMatchObject({ total: 1, fresh: 1 })
    expect(out.freshPostings).toHaveLength(1)
    expect(out.freshPostings[0].title).toBe('Software Intern')
    expect(ports.upsertPostings.mock.calls[0][1]).toHaveLength(1)
    expect(ports.recordRun.mock.calls[0][1]).toMatchObject({ id: 'r1', newCount: 1 })
  })

  it('treats an already-stored posting as relevant but not fresh', async () => {
    const ports = {
      getExistingIds: vi.fn(async () => new Set([makeId('s', '1')])),
      upsertPostings: vi.fn(async () => {}),
      recordRun: vi.fn(async () => {}),
    }
    const out = await runPipeline({ items, results: [] }, { db: {}, rules, runId: 'r3', ports })
    expect(out.total).toBe(1)
    expect(out.fresh).toBe(0)
    expect(out.freshPostings).toHaveLength(0)
  })

  // A careers board sends every open job whatever its date; the old ones
  // are dropped before anything is stored, and the run says how many, with
  // what the store's write cleaned out.
  it('skips postings posted over two months ago, and reports them with what the store removed', async () => {
    const now = Date.parse('2026-09-30T12:00:00.000Z')
    const dated = (id, days) => ({ source: 's', raw: { externalId: id, title: 'Software Intern', company: 'A', url: 'u' + id, location: 'Remote', postedAt: new Date(now - days * 86400000).toISOString() } })
    const ports = {
      getExistingIds: vi.fn(async () => new Set()),
      upsertPostings: vi.fn(async () => ({ removed: 3 })),
      recordRun: vi.fn(async () => {}),
    }
    const out = await runPipeline({ items: [dated('1', 10), dated('2', 75)], results: [] }, { db: {}, rules, runId: 'r2', ports, now })
    expect(out).toMatchObject({ total: 1, tooOld: 1, removed: 3 })
    expect(ports.upsertPostings.mock.calls[0][1].map((p) => p.externalId)).toEqual(['1'])
  })
})

describe('runPipeline and closed postings', () => {
  const ports = () => ({
    getExistingIds: vi.fn(async () => new Set()),
    upsertPostings: vi.fn(async () => ({ removed: 2, closed: 2 })),
    recordRun: vi.fn(async () => {}),
  })

  it('hands the write what the run learned about gone postings, and counts a live link as seen', async () => {
    const p = ports()
    const closure = { listed: ['a'], missed: ['m'], gone: ['g'], live: ['l'], checked: 7 }
    const out = await runPipeline({ items: [], results: [], seen: ['s1'], closure }, { db: {}, rules, runId: 'r', ports: p })
    expect(p.upsertPostings.mock.calls[0][3]).toEqual(['s1', 'l'])
    expect(p.upsertPostings.mock.calls[0][4]).toBe(closure)
    expect(p.recordRun.mock.calls[0][1]).toMatchObject({ closed: 2, checked: 7 })
    expect(out).toMatchObject({ closed: 2, checked: 7 })
  })

  it('keeps a deadline the board published beside the normalized posting', async () => {
    const p = ports()
    const raw = { externalId: '9', title: 'Software Intern', company: 'A', url: 'u9', location: 'Remote', closesAt: '2026-10-09T23:59:59+05:30' }
    await runPipeline({ items: [{ source: 's', raw }], results: [] }, { db: {}, rules, runId: 'r', ports: p })
    expect(p.upsertPostings.mock.calls[0][1][0].closesAt).toBe('2026-10-09T23:59:59+05:30')
  })
})

// A blocked company's postings never reach the write, so they never re-enter
// the corpus; the run says how many it left out. Only relevant ones count.
describe('runPipeline and blocked companies', () => {
  it('drops the postings of a blocked company before the write, and counts them', async () => {
    const p = { getExistingIds: vi.fn(async () => new Set()), upsertPostings: vi.fn(async () => ({})), recordRun: vi.fn(async () => {}) }
    const job = (id, company, title = 'Software Intern') => ({ source: 'board', raw: { externalId: id, title, company, url: `u${id}`, location: 'Remote' } })
    const isBlocked = (posting) => posting.company === 'Fake Corp'
    const raws = [job('1', 'Fake Corp'), job('2', 'Real Co'), job('3', 'Fake Corp', 'Chef')]
    const out = await runPipeline({ items: raws, results: [] }, { db: {}, rules, runId: 'r', ports: p, isBlocked })
    expect(p.upsertPostings.mock.calls[0][1].map((posting) => posting.company)).toEqual(['Real Co'])
    expect(out).toMatchObject({ total: 1, fresh: 1, blocked: 1 })
  })

  it('blocks nothing when told of no block', async () => {
    const p = { getExistingIds: vi.fn(async () => new Set()), upsertPostings: vi.fn(async () => ({})), recordRun: vi.fn(async () => {}) }
    const out = await runPipeline({ items, results: [] }, { db: {}, rules, runId: 'r', ports: p })
    expect(out.blocked).toBe(0)
  })
})
