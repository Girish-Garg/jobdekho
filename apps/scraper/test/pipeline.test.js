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
    expect(out).toMatchObject({ total: 1, fresh: 1 })
    expect(out.freshPostings).toHaveLength(1)
    expect(ports.upsertPostings.mock.calls[0][1]).toHaveLength(1)
    expect(sent[0]).toContain('Software Intern')
    expect(ports.recordRun.mock.calls[0][1]).toMatchObject({ id: 'r1', newCount: 1 })
  })

  it('caps the alert flood and reports the remainder as a count', async () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      source: 's',
      raw: { externalId: String(i), title: `Software Engineer ${i}`, company: 'A', url: `u${i}`, location: 'Remote' },
    }))
    const sent = []
    const ports = {
      getExistingIds: vi.fn(async () => new Set()),
      upsertPostings: vi.fn(async () => {}),
      recordRun: vi.fn(async () => {}),
      sendTelegram: vi.fn(async (_t, text) => { sent.push(text); return { ok: true } }),
    }
    const open = { includeKeywords: ['software'], excludeKeywords: [], locations: ['remote'] }
    const out = await runPipeline({ items: many, results: [] }, { db: {}, rules: open, telegram: {}, runId: 'r2', ports })

    expect(out.fresh).toBe(100)
    // Everything is still stored and counted; only the chat output is capped.
    expect(ports.upsertPostings.mock.calls[0][1]).toHaveLength(100)
    expect(ports.recordRun.mock.calls[0][1]).toMatchObject({ newCount: 100 })
    expect(sent.at(-1)).toContain('70 more')
  })
})
