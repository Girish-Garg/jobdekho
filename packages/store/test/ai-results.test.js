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

  it('saves a record with the time and reads it back by posting and kind', async () => {
    const saved = await setAiResult(store, 'me', CHECK)
    expect(saved).toEqual({ kind: 'fake-check', postingId: 'p1', provider: 'claude', createdAt: saved.createdAt, result: { verdict: 'genuine' } })
    expect(saved.createdAt).toMatch(/Z$/)
    expect(await getAiResult(store, 'me', 'p1', 'fake-check')).toEqual(saved)
    expect(await getAiResult(store, 'me', 'p1', 'cover-letter')).toBeNull()
    expect(await getAiResult(store, 'someone-else', 'p1', 'fake-check')).toBeNull()
  })

  it('a rerun replaces the last answer for that posting and kind', async () => {
    await setAiResult(store, 'me', CHECK)
    await setAiResult(store, 'me', { ...CHECK, result: { verdict: 'suspicious' } })
    expect(await listAiResults(store, 'me', 'p1')).toHaveLength(1)
    expect((await getAiResult(store, 'me', 'p1', 'fake-check')).result).toEqual({ verdict: 'suspicious' })
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
  })
})
