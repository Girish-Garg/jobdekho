import { describe, it, expect } from 'vitest'
import { runAdapters } from '../src/runner.js'

const ok = { name: 'ok', fetch: async () => [{ externalId: '1' }] }
const boom = { name: 'boom', fetch: async () => { throw new Error('down') } }

describe('runAdapters', () => {
  it('collects items and isolates failures', async () => {
    const { items, results } = await runAdapters([ok, boom], null, { retries: 0 })
    expect(items).toEqual([{ source: 'ok', raw: { externalId: '1' } }])
    expect(results).toEqual([
      { name: 'ok', ok: true, count: 1, error: null },
      { name: 'boom', ok: false, count: 0, error: 'down' },
    ])
  })
})
