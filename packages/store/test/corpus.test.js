import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openCorpus } from '@jobdekho/store/corpus.js'
import { parseNdjson, toNdjson } from '@jobdekho/store/ndjson.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const asMap = (rows) => new Map(rows.map((row) => [row.id, row]))
const rows = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]

describe('ndjson', () => {
  it('round-trips rows one per line and tolerates blank lines', () => {
    const text = toNdjson(rows)
    expect(text).toBe('{"id":"a","title":"A"}\n{"id":"b","title":"B"}\n')
    expect(parseNdjson(`\n${text}\n\n`)).toEqual(rows)
    expect(parseNdjson('')).toEqual([])
  })

  it('a torn line throws rather than silently dropping postings', () => {
    expect(() => parseNdjson('{"id":"a"}\n{"id":')).toThrow()
  })
})

describe('openCorpus', () => {
  it('round-trips rows through the file', () => {
    const path = join(dir, 'postings.ndjson')
    openCorpus(path).save(asMap(rows))
    const again = openCorpus(path)
    expect(again.rows()).toEqual(rows)
    expect(again.byId().get('b')).toEqual(rows[1])
  })

  it('a missing file is an empty corpus', () => {
    const corpus = openCorpus(join(dir, 'postings.ndjson'))
    expect(corpus.rows()).toEqual([])
    expect(corpus.byId().size).toBe(0)
  })

  it('hands out the same rows array until the corpus changes', () => {
    const path = join(dir, 'postings.ndjson')
    const corpus = openCorpus(path)
    corpus.save(asMap(rows))
    const loaded = corpus.rows()
    expect(corpus.rows()).toBe(loaded)
    // A save from this handle and a rewrite from another handle (another
    // process, in real use) both have to produce a new array, because the
    // rarity cache is keyed on the array and must not survive either.
    corpus.save(asMap([...rows, { id: 'c', title: 'C' }]))
    const saved = corpus.rows()
    expect(saved).not.toBe(loaded)
    expect(saved).toHaveLength(3)
    openCorpus(path).save(asMap(rows.slice(0, 1)))
    const rewritten = corpus.rows()
    expect(rewritten).not.toBe(saved)
    expect(rewritten.map((r) => r.id)).toEqual(['a'])
  })

  it('ignores a temp file a crashed writer left beside it', () => {
    const path = join(dir, 'postings.ndjson')
    openCorpus(path).save(asMap(rows))
    writeFileSync(join(dir, '.postings.ndjson.999-dead.tmp'), '{"id":"torn","ti')
    expect(openCorpus(path).rows()).toEqual(rows)
    expect(readFileSync(path, 'utf8')).toBe(toNdjson(rows))
  })

  it('keeps the last row when a hand-edited file repeats an id', () => {
    const path = join(dir, 'postings.ndjson')
    writeFileSync(path, '{"id":"a","title":"old"}\n{"id":"a","title":"new"}\n')
    const corpus = openCorpus(path)
    expect(corpus.rows()).toEqual([{ id: 'a', title: 'new' }])
    expect(corpus.byId().size).toBe(1)
  })
})
