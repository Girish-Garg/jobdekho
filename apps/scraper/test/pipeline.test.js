import { describe, it, expect, vi } from 'vitest'
import { runPipeline } from '../src/pipeline.js'

const rules = {
  includeKeywords: ['software'], excludeKeywords: [], locations: ['remote'], internshipOnly: true,
}
const items = [
  { source: 's', raw: { externalId: '1', title: 'Software Intern', company: 'A', url: 'u1', location: 'Remote' } },
  { source: 's', raw: { externalId: '2', title: 'Chef', company: 'B', url: 'u2', location: 'Remote' } },
]

describe('runPipeline', () => {
  it('filters, dedupes, persists, and notifies only fresh', async () => {
    const sent = []
    const ports = {
      getExistingIds: vi.fn(async () => new Set()),
      upsertPostings: vi.fn(async () => {}),
      recordRun: vi.fn(async () => {}),
      sendTelegram: vi.fn(async (_t, text) => { sent.push(text); return { ok: true } }),
    }
    const out = await runPipeline({ items, results: [] }, { db: {}, rules, telegram: {}, runId: 'r1', ports })
    expect(out).toEqual({ total: 1, fresh: 1 })
    expect(ports.upsertPostings.mock.calls[0][1]).toHaveLength(1)
    expect(sent[0]).toContain('Software Intern')
    expect(ports.recordRun.mock.calls[0][1]).toMatchObject({ id: 'r1', newCount: 1 })
  })
})
