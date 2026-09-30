import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { setPostingStatus } from '@jobdekho/store/dashboard.js'
import { getPosting, postingNames } from '@jobdekho/store/posting-lookup.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const DAY = 24 * 60 * 60 * 1000
const ago = (days) => new Date(Date.now() - days * DAY).toISOString()
const LONG = `We use python and react. ${'Lorem ipsum dolor sit amet. '.repeat(40)}`

function row(over = {}) {
  const id = over.id ?? 'p1'
  return {
    id, source: 'internshala', externalId: id, title: 'Software Engineer', company: 'Acme',
    location: 'Bangalore', url: `https://x/${id}`, descriptionSnippet: 'Build things.',
    descriptionText: LONG, tags: [], postedAt: ago(1), firstSeenAt: ago(1), lastSeenAt: ago(0),
    stipend: '10,000', level: 'mid', groupKey: 'software engineer|acme', ...over,
  }
}

function seeded(rows) {
  const store = openStore(dir)
  store.corpus.save(new Map(rows.map((r) => [r.id, r])))
  return store
}

describe('getPosting', () => {
  it('is null for an id the corpus does not have', async () => {
    expect(await getPosting(seeded([row()]), 'me', 'nope')).toBeNull()
  })

  // The feed withholds the description; a check on the job has to read it.
  it('returns the row with its full description, status and ghost fields', async () => {
    const store = seeded([row()])
    await setPostingStatus(store, 'me', 'p1', 'saved')
    const posting = await getPosting(store, 'me', 'p1')
    expect(posting).toMatchObject({ id: 'p1', title: 'Software Engineer', descriptionText: LONG, status: 'saved', groupCount: 1 })
    expect(posting.legitimacy).toBe('high')
    expect(posting.ghostSignals).toEqual([])
    expect((await getPosting(store, 'someone-else', 'p1')).status).toBeNull()
  })

  // What the fit read from the ad is the feed's working, not part of the job.
  it('leaves out the features the fit read', async () => {
    const store = seeded([row({ features: { v: 1, skills: { python: 'req' } } })])
    expect(await getPosting(store, 'me', 'p1')).not.toHaveProperty('features')
  })

  it('computes the blast signal over the whole corpus, so it agrees with the card', async () => {
    const sources = ['internshala', 'naukri', 'linkedin', 'lever', 'ashby']
    const store = seeded(sources.map((source, i) => row({ id: `p${i}`, source })))
    const posting = await getPosting(store, 'me', 'p0')
    expect(posting.ghostSignals).toContain('listed on 5 job boards')
    expect(posting.groupCount).toBe(5)
  })

  it('reports the signals a doubtful posting shows on its card', async () => {
    const store = seeded([row({ stipend: null, descriptionText: 'Apply now.', postedAt: ago(120) })])
    const posting = await getPosting(store, 'me', 'p1')
    expect(posting.ghostSignals).toEqual(['no pay stated', 'very short job description', 'posted 4 months ago'])
    expect(posting.legitimacy).toBe('suspicious')
  })
})

describe('postingNames', () => {
  it('names each id the corpus still holds, and leaves out the rest', () => {
    const names = postingNames(seeded([row(), row({ id: 'p2', title: 'Designer', company: 'Initech' })]), ['p2', 'gone', 'p1'])
    expect([...names]).toEqual([['p2', { title: 'Designer', company: 'Initech' }], ['p1', { title: 'Software Engineer', company: 'Acme' }]])
  })
})
