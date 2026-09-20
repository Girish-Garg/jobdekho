import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { getAiResult, setAiResult, listAiResults } from '@jobdekho/store/ai-results.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const CHECK = { postingId: 'p1', kind: 'fake-check', provider: 'claude', result: { verdict: 'genuine' } }

describe('ai results', () => {
  it('is null and empty before anything was saved, and writes no file for that', async () => {
    expect(await getAiResult(store, 'me', 'p1', 'fake-check')).toBeNull()
    expect(await listAiResults(store, 'me', 'p1')).toEqual([])
    expect(existsSync(join(dir, FILES.aiResults))).toBe(false)
  })

  it('saves a record with one version, an empty instruction, and reads it back by posting and kind', async () => {
    const saved = await setAiResult(store, 'me', CHECK)
    expect(saved).toEqual({
      kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: saved.createdAt,
      result: { verdict: 'genuine' }, dropped: false,
      versions: [{ instruction: '', provider: 'claude', createdAt: saved.createdAt, result: { verdict: 'genuine' } }],
    })
    expect(saved.createdAt).toMatch(/Z$/)
    expect(await getAiResult(store, 'me', 'p1', 'fake-check')).toEqual(saved)
    expect(await getAiResult(store, 'me', 'p1', 'cover-letter')).toBeNull()
    expect(await getAiResult(store, 'someone-else', 'p1', 'fake-check')).toBeNull()
  })

  it('a rerun appends a version rather than replacing the record', async () => {
    await setAiResult(store, 'me', CHECK)
    const second = await setAiResult(store, 'me', { ...CHECK, result: { verdict: 'suspicious' } })
    expect(await listAiResults(store, 'me', 'p1')).toHaveLength(1)
    expect(second.versions).toHaveLength(2)
    expect(second.versions.map((v) => v.result)).toEqual([{ verdict: 'genuine' }, { verdict: 'suspicious' }])
    expect((await getAiResult(store, 'me', 'p1', 'fake-check')).result).toEqual({ verdict: 'suspicious' })
  })

  it('carries the instruction on a refine and leaves it empty on a plain rerun', async () => {
    await setAiResult(store, 'me', CHECK)
    const refined = await setAiResult(store, 'me', { ...CHECK, result: { verdict: 'unclear' }, instruction: 'check the recruiter email' })
    const again = await setAiResult(store, 'me', { ...CHECK, result: { verdict: 'unclear' } })
    expect(refined.versions.map((v) => v.instruction)).toEqual(['', 'check the recruiter email'])
    expect(again.versions.map((v) => v.instruction)).toEqual(['', 'check the recruiter email', ''])
  })

  it('caps the versions kept and says the oldest were dropped', async () => {
    let record
    for (let i = 0; i < 12; i += 1) record = await setAiResult(store, 'me', { ...CHECK, result: { n: i } })
    expect(record.versions).toHaveLength(10)
    expect(record.versions[0].result).toEqual({ n: 2 })
    expect(record.versions.at(-1).result).toEqual({ n: 11 })
    expect(record.dropped).toBe(true)
  })

  it('does not say versions were dropped when the cap was never reached', async () => {
    const record = await setAiResult(store, 'me', CHECK)
    expect(record.dropped).toBe(false)
  })

  it('reads a record written by today\'s code as a one-version history', async () => {
    // Simulates a file saved before versions existed: no `versions`, no
    // `dropped`, just the one answer this file used to keep.
    const legacy = { kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: '2026-09-01T00:00:00.000Z', result: { verdict: 'genuine' } }
    store.aiResults.set('me', { 'p1:fake-check': legacy })

    const read = await getAiResult(store, 'me', 'p1', 'fake-check')
    expect(read).toEqual({
      ...legacy, dropped: false,
      versions: [{ instruction: '', provider: 'claude', createdAt: '2026-09-01T00:00:00.000Z', result: { verdict: 'genuine' } }],
    })
    expect(await listAiResults(store, 'me', 'p1')).toEqual([read])

    // A refine on top of it grows the legacy answer into a two-version
    // history rather than losing it.
    const refined = await setAiResult(store, 'me', { ...CHECK, result: { verdict: 'unclear' }, instruction: 'shorter' })
    expect(refined.versions).toEqual([
      { instruction: '', provider: 'claude', createdAt: '2026-09-01T00:00:00.000Z', result: { verdict: 'genuine' } },
      { instruction: 'shorter', provider: 'claude', createdAt: refined.createdAt, result: { verdict: 'unclear' } },
    ])
  })

  it('lists every kind saved for one posting and nothing from another', async () => {
    await setAiResult(store, 'me', CHECK)
    await setAiResult(store, 'me', { ...CHECK, kind: 'cover-letter', result: { text: 'Dear' } })
    await setAiResult(store, 'me', { ...CHECK, postingId: 'p2' })
    expect((await listAiResults(store, 'me', 'p1')).map((r) => r.kind).sort()).toEqual(['cover-letter', 'fake-check'])
  })

  it('keeps the records in ai-results.json keyed by user, then posting and kind', async () => {
    await setAiResult(store, 'me', CHECK)
    const file = JSON.parse(readFileSync(join(dir, FILES.aiResults), 'utf8'))
    expect(Object.keys(file)).toEqual(['me'])
    expect(Object.keys(file.me)).toEqual(['p1:fake-check'])
    expect(file.me['p1:fake-check']).toMatchObject({ kind: 'fake-check', postingId: 'p1', result: { verdict: 'genuine' } })
    expect(file.me['p1:fake-check'].versions).toHaveLength(1)
  })
})
