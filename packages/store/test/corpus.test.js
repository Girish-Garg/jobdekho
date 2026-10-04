import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openCorpus } from '@jobdekho/store/corpus.js'
import { parseNdjson, toNdjson } from '@jobdekho/store/ndjson.js'
import { TAGS_VERSION } from '@jobdekho/core/tag.js'
import { LEVEL_MODEL_VERSION } from '@jobdekho/core/model/version.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const asMap = (rows) => new Map(rows.map((row) => [row.id, row]))
const rows = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]
// A row tagged by today's rules and estimated by today's level model.
const CURRENT = { tagsVersion: TAGS_VERSION, modelVersion: LEVEL_MODEL_VERSION }

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
    const tagged = rows.map((row) => ({ ...row, ...CURRENT }))
    openCorpus(path).save(asMap(tagged))
    const again = openCorpus(path)
    expect(again.rows()).toEqual(tagged)
    expect(again.byId().get('b')).toEqual(tagged[1])
  })

  // Rows tagged under older rules are tagged again as they load, once, from
  // the text they kept; the next write keeps the new tags.
  it('tags rows from an older version as it loads them', () => {
    const path = join(dir, 'postings.ndjson')
    const old = { id: 'o', source: 'linkedin', title: 'Senior Data Engineer', descriptionText: 'Workplace type: Hybrid', level: 'mid', workMode: 'onsite' }
    writeFileSync(path, toNdjson([old, { id: 'n', title: 'Kept', ...CURRENT }]))
    const corpus = openCorpus(path)
    expect(corpus.byId().get('o')).toMatchObject({
      level: 'senior', levelTag: { from: 'title' }, workMode: 'hybrid', workModeTag: { from: 'text' }, tagsVersion: TAGS_VERSION,
    })
    expect(corpus.byId().get('n')).toEqual({ id: 'n', title: 'Kept', ...CURRENT })
    corpus.save(corpus.byId())
    expect(parseNdjson(readFileSync(path, 'utf8'))[0].tagsVersion).toBe(TAGS_VERSION)
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
    const tagged = rows.map((row) => ({ ...row, ...CURRENT }))
    openCorpus(path).save(asMap(tagged))
    writeFileSync(join(dir, '.postings.ndjson.999-dead.tmp'), '{"id":"torn","ti')
    expect(openCorpus(path).rows()).toEqual(tagged)
    expect(readFileSync(path, 'utf8')).toBe(toNdjson(tagged))
  })

  it('keeps the last row when a hand-edited file repeats an id', () => {
    const path = join(dir, 'postings.ndjson')
    writeFileSync(path, toNdjson([{ id: 'a', title: 'old', ...CURRENT }, { id: 'a', title: 'new', ...CURRENT }]))
    const corpus = openCorpus(path)
    expect(corpus.rows()).toEqual([{ id: 'a', title: 'new', ...CURRENT }])
    expect(corpus.byId().size).toBe(1)
  })
})
