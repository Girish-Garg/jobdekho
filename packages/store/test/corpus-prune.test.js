import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { upsertPostings } from '@jobdekho/store/queries.js'
import { pruneRows } from '@jobdekho/store/corpus-prune.js'
import { touchedPostingIds } from '@jobdekho/store/corpus-keep.js'

const NOW = Date.parse('2026-09-30T12:00:00.000Z')
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString()
const row = (id, over = {}) => ({ id, source: 's', title: 'Engineer', company: 'Acme', url: `https://x/${id}`, postedAt: daysAgo(5), lastSeenAt: daysAgo(1), firstSeenAt: daysAgo(5), ...over })

const dirs = []
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }) })
function store() {
  const dir = mkdtempSync(join(tmpdir(), 'jobdekho-prune-'))
  dirs.push(dir)
  return openStore(dir)
}

describe('pruneRows', () => {
  it('drops what is too old and says how many, keeping what the person touched', () => {
    const rows = new Map([
      ['fresh', row('fresh')],
      ['old', row('old', { postedAt: daysAgo(70) })],
      ['gone', row('gone', { postedAt: null, lastSeenAt: daysAgo(65) })],
      ['saved-old', row('saved-old', { postedAt: daysAgo(120) })],
    ])
    const { rows: kept, removed } = pruneRows(rows, { keep: new Set(['saved-old']), now: NOW })
    expect([...kept.keys()]).toEqual(['fresh', 'saved-old'])
    expect(removed).toBe(2)
  })
})

describe('touchedPostingIds', () => {
  it('is what was saved, applied to, answered about or made a document for, never what was dismissed', () => {
    const s = store()
    s.statuses.set('me', { a: 'saved', b: 'applied', c: 'dismissed' })
    s.aiResults.set('me', { 'd:cover-letter': { postingId: 'd', kind: 'cover-letter' } })
    s.documents.set('me', { documents: [{ id: 'doc1', postingId: 'e' }, { id: 'doc2', postingId: null }] })
    expect([...touchedPostingIds(s)].sort()).toEqual(['a', 'b', 'd', 'e'])
  })
})

describe('upsertPostings', () => {
  it('cleans the old out in the same write, and keeps a job the person saved', async () => {
    const s = store()
    s.corpus.save(new Map([
      ['old', row('old', { postedAt: daysAgo(80) })],
      ['saved', row('saved', { postedAt: daysAgo(80) })],
      ['dead', row('dead', { postedAt: null, lastSeenAt: daysAgo(90) })],
    ]))
    s.statuses.set('me', { saved: 'saved' })
    const { removed } = await upsertPostings(s, [row('new', { postedAt: daysAgo(2) })], NOW)
    expect(removed).toBe(2)
    expect([...s.corpus.byId().keys()].sort()).toEqual(['new', 'saved'])
  })
})
