import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { upsertPostings } from '@jobdekho/store/queries.js'
import { skillDocFreq } from '@jobdekho/store/skill-doc-freq.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const posting = (id, over) => ({
  id, source: 's', externalId: id, title: 'Role', company: 'C', url: 'u', descriptionSnippet: '', tags: [], ...over,
})

describe('skillDocFreq', () => {
  it('counts postings mentioning each skill, on word boundaries, in the title or the body', async () => {
    await upsertPostings(store, [
      posting('a', { title: 'Java Developer', descriptionText: 'javascript only' }),
      posting('b', { title: 'Python Dev', descriptionText: 'Needs JAVA and c++' }),
      posting('c', { title: 'Chef', descriptionText: null, descriptionSnippet: 'knows c' }),
    ])
    expect(skillDocFreq(store, ['java', 'c', 'python', 'kubernetes'])).toEqual({
      docFreq: { java: 2, c: 2, python: 1, kubernetes: 0 },
      totalDocs: 3,
    })
  })

  it('answers empty for no skills', () => {
    expect(skillDocFreq(store, [])).toEqual({ docFreq: {}, totalDocs: 0 })
  })

  it('is cached per skill set and thrown away when the corpus changes', async () => {
    await upsertPostings(store, [posting('a', { title: 'Java Developer' })])
    const first = skillDocFreq(store, ['java', 'go'])
    expect(skillDocFreq(store, ['go', 'java'])).toBe(first)
    expect(skillDocFreq(store, ['java'])).not.toBe(first)
    await upsertPostings(store, [posting('b', { title: 'Go Developer' })])
    const after = skillDocFreq(store, ['java', 'go'])
    expect(after).not.toBe(first)
    expect(after).toEqual({ docFreq: { java: 1, go: 1 }, totalDocs: 2 })
  })

  it('is thrown away when another handle rewrites the corpus', async () => {
    await upsertPostings(store, [posting('a', { title: 'Java Developer' })])
    const first = skillDocFreq(store, ['java'])
    await upsertPostings(openStore(dir), [posting('b', { title: 'Java Architect' })])
    expect(skillDocFreq(store, ['java'])).toEqual({ docFreq: { java: 2 }, totalDocs: 2 })
    expect(first.docFreq.java).toBe(1)
  })
})
