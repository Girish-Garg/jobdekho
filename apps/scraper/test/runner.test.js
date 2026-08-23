import { describe, it, expect } from 'vitest'
import { runAdapters } from '../src/runner.js'

const ok = { name: 'ok', fetch: async () => [{ externalId: '1' }] }
const boom = { name: 'boom', fetch: async () => { throw new Error('down') } }

const delay = (ms, value) => new Promise((resolve) => setTimeout(() => resolve(value), ms))

describe('runAdapters', () => {
  it('collects items and isolates failures', async () => {
    const { items, results } = await runAdapters([ok, boom], null, { retries: 0 })
    expect(items).toEqual([{ source: 'ok', raw: { externalId: '1' } }])
    expect(results).toEqual([
      { name: 'ok', ok: true, count: 1, error: null },
      { name: 'boom', ok: false, count: 0, error: 'down' },
    ])
  })

  // Sources run through a bounded pool, so completion order does not match
  // input order. The run summary and stored source_results depend on it doing so.
  it('keeps results in input order even when a later adapter finishes first', async () => {
    const slow = { name: 'slow', fetch: async () => { await delay(30); return [{ externalId: 'slow' }] } }
    const fast = { name: 'fast', fetch: async () => { await delay(1); return [{ externalId: 'fast' }] } }
    const { results } = await runAdapters([slow, fast, ok, boom], null, { retries: 0 })
    expect(results.map((r) => r.name)).toEqual(['slow', 'fast', 'ok', 'boom'])
  })

  it('runs adapters concurrently instead of one at a time', async () => {
    const started = []
    const makeAdapter = (name) => ({
      name,
      fetch: async () => { started.push(name); await delay(20); return [] },
    })
    const adapters = Array.from({ length: 5 }, (_, i) => makeAdapter(`a${i}`))
    const startTime = Date.now()
    await runAdapters(adapters, null, { retries: 0 })
    // Serial execution would take 5 * 20ms = 100ms; a pool overlaps them.
    expect(Date.now() - startTime).toBeLessThan(90)
    expect(started).toHaveLength(5)
  })

  it('retries a failing adapter the requested number of times before giving up', async () => {
    let attempts = 0
    const flaky = { name: 'flaky', fetch: async () => { attempts++; throw new Error('nope') } }
    const { results } = await runAdapters([flaky], null, { retries: 2 })
    expect(attempts).toBe(3)
    expect(results[0]).toMatchObject({ name: 'flaky', ok: false })
  })
})
