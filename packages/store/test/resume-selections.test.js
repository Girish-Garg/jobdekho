import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { normalizeResumeSelection, getResumeSelection, upsertResumeSelection } from '@jobdekho/store/resume-selections.js'

let dir
let store
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')); store = openStore(dir) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('normalizeResumeSelection', () => {
  it('defaults to the classic template and no sections chosen', () => {
    expect(normalizeResumeSelection(undefined)).toEqual({ template: 'classic', sections: {} })
    expect(normalizeResumeSelection({})).toEqual({ template: 'classic', sections: {} })
  })

  it('keeps any other template id as given', () => {
    expect(normalizeResumeSelection({ template: 'compact' }).template).toBe('compact')
  })

  it('keeps a section only when it is a real array of string ids', () => {
    const out = normalizeResumeSelection({ sections: { experience: ['a', 'b'], projects: 'nope', education: [1, 2] } })
    expect(out.sections).toEqual({ experience: ['a', 'b'], education: [] })
  })

  // The whole point of leaving a key out rather than defaulting it to []:
  // see resume/selection.js on the server, where undefined means "everything
  // in profile order" and [] means "nothing". A save that only ever mentions
  // one section must not silently empty every other one.
  it('never invents an empty array for a section the caller did not mention', () => {
    expect(normalizeResumeSelection({ sections: { experience: ['a'] } }).sections).toEqual({ experience: ['a'] })
  })
})

describe('getResumeSelection / upsertResumeSelection', () => {
  it('reads null until saved, then the normalized record', async () => {
    expect(await getResumeSelection(store, 'me')).toBeNull()
    await upsertResumeSelection(store, 'me', { template: 'academic', sections: { experience: ['a'] } })
    expect(await getResumeSelection(store, 'me')).toEqual({ template: 'academic', sections: { experience: ['a'] } })
  })

  it('keeps one person\'s selection from leaking into another\'s read', async () => {
    await upsertResumeSelection(store, 'me', { template: 'compact' })
    expect(await getResumeSelection(store, 'someone-else')).toBeNull()
  })
})
