import { describe, it, expect, vi } from 'vitest'
import { runPipeline } from '../src/pipeline.js'

// A rule that throws on one posting, the way core's graduate-programmes.js
// once did on a company named Constructor.
vi.mock('@jobdekho/core/normalize.js', async (importOriginal) => {
  const real = await importOriginal()
  const normalize = (raw, source) => {
    if (raw.title === 'Broken Engineer') throw new TypeError('a rule broke')
    return real.normalize(raw, source)
  }
  return { ...real, normalize }
})

const rules = { includeKeywords: ['engineer'], excludeKeywords: [], locations: ['remote'], internshipOnly: false }
const raw = (id, title) => ({ externalId: id, title, company: 'Acme', url: `u${id}`, location: 'Remote' })

describe('runPipeline with a posting the rules cannot read', () => {
  it('leaves that one out and keeps the rest of the run', async () => {
    const ports = {
      getExistingIds: vi.fn(async () => new Set()),
      upsertPostings: vi.fn(async () => {}),
      recordRun: vi.fn(async () => {}),
    }
    const items = [{ source: 's', raw: raw('1', 'Software Engineer') }, { source: 't', raw: raw('2', 'Broken Engineer') }]
    const out = await runPipeline({ items, results: [] }, { db: {}, rules, runId: 'r1', ports })
    expect(out).toMatchObject({ total: 1, fresh: 1 })
    expect(ports.upsertPostings.mock.calls[0][1].map((p) => p.title)).toEqual(['Software Engineer'])
    expect(ports.recordRun).toHaveBeenCalled()
    expect(out.unread).toHaveLength(1)
    expect(out.unread[0]).toMatchObject({ source: 't', title: 'Broken Engineer', company: 'Acme' })
    expect(out.unread[0].error.message).toBe('a rule broke')
  })
})
