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
})
