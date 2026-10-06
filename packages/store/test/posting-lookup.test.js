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

  it('counts the group over the whole corpus, so it agrees with the card', async () => {
    const sources = ['internshala', 'unstop', 'linkedin', 'lever', 'ashby']
    const store = seeded(sources.map((source, i) => row({ id: `p${i}`, source })))
    const posting = await getPosting(store, 'me', 'p0')
    expect(posting.groupCount).toBe(5)
    expect(posting.caution).toEqual([])
  })

  // No pay, a short text and an old date once made Infosys, EY and Google
  // read as Caution.
  it('raises no Caution for a posting with no red flag', async () => {
    const store = seeded([row({ stipend: null, descriptionText: 'Apply now.', postedAt: ago(120), caution: [], fewDetails: true })])
    const posting = await getPosting(store, 'me', 'p1')
    expect(posting).toMatchObject({ caution: [], legitimacy: 'high', ghostSignals: [], fewDetails: true })
  })

  it('states its red flags, the corpus-wide one included', async () => {
    const fee = { code: 'fee', reason: 'Asks applicants to pay a ₹1,500 registration fee', evidence: 'x' }
    const store = seeded([
      row({ id: 'm1', source: 'linkedin', company: 'Vortenza', adKey: 'same', caution: [fee] }),
      row({ id: 'm2', source: 'linkedin', company: 'Devryxa', adKey: 'same' }),
      row({ id: 'm3', source: 'greenhouse:zen', company: 'Zenithbyte', adKey: 'same' }),
    ])
    const posting = await getPosting(store, 'me', 'm1')
    expect(posting.caution.map((c) => c.code)).toEqual(['fee', 'shared-ad'])
    expect(posting.legitimacy).toBe('low')
    expect(posting.ghostSignals[1]).toBe('The same ad appears under 3 company names')
    // A company's own careers site is never flagged.
    expect((await getPosting(store, 'me', 'm3')).caution).toEqual([])
  })

  it('lays the description out in sections, with the facts it states', async () => {
    const text = 'Requirements:\n- 3-5 years of Go\nWhat you will do\n- Build APIs\nAcme is an equal opportunity employer.'
    const workModeTag = { value: 'hybrid', from: 'text', evidence: 'Says "Workplace type: Hybrid"', version: 2 }
    const store = seeded([row({ descriptionText: text, workModeTag, stipend: null, payTag: null })])
    const posting = await getPosting(store, 'me', 'p1')
    expect(posting.sections.map((s) => [s.kind, s.boilerplate])).toEqual([['duties', false], ['requirements', false], ['other', true]])
    expect(posting.facts).toEqual({
      years: { min: 3, max: 5, from: 'text', evidence: 'Says "3-5 years of Go"' },
      pay: null,
      workMode: { value: 'hybrid', from: 'text', evidence: 'Says "Workplace type: Hybrid"' },
      ppo: null, email: null, openings: null, bond: null, start: null, shift: null,
    })
    expect(posting.workModeTag).toEqual(workModeTag)
  })

  // Only a text with no heading is sorted by the small section model, and
  // then every section says so. What the shipped weights place is theirs to
  // say; the shape is what the pane codes against.
  it('sorts a text no heading organises with the section model, marked as its', async () => {
    const text = 'We are hiring an engineer. Design and build REST APIs in Go. Write tests for every change. You need a degree in computer science. We offer health insurance for your family.'
    const store = seeded([row({ descriptionText: text }), row({ id: 'p2', descriptionText: 'Responsibilities\n- Build APIs' })])
    const sorted = (await getPosting(store, 'me', 'p1')).sections
    expect(sorted === null || sorted.every((s) => s.from === 'model' && s.heading === null && Number.isInteger(s.version))).toBe(true)
    expect((await getPosting(store, 'me', 'p2')).sections.every((s) => s.from === undefined)).toBe(true)
  })

  // A sentence the company repeats across its own postings is its template.
  it('folds the company template text it repeats in three postings', async () => {
    const about = 'About Acme\nAcme builds payment rails for small shops across India.'
    const rows = [1, 2, 3].map((n) => row({ id: `a${n}`, descriptionText: `${about}\nResponsibilities\n- Task number ${n} for the team` }))
    const posting = await getPosting(seeded(rows), 'me', 'a1')
    expect(posting.sections.find((s) => s.kind === 'about')).toMatchObject({ heading: 'About Acme', boilerplate: true })
    expect(posting.sections.find((s) => s.kind === 'duties').boilerplate).toBe(false)
  })

  it('leaves out what the tags were read from', async () => {
    const store = seeded([row({ board: { type: 'job' }, adKey: 'k', tagsVersion: 2, modelVersion: 1 })])
    const posting = await getPosting(store, 'me', 'p1')
    for (const key of ['board', 'adKey', 'tagsVersion', 'modelVersion', 'features']) expect(posting).not.toHaveProperty(key)
  })
})

describe('postingNames', () => {
  it('names each id the corpus still holds, and leaves out the rest', () => {
    const names = postingNames(seeded([row(), row({ id: 'p2', title: 'Designer', company: 'Initech' })]), ['p2', 'gone', 'p1'])
    expect([...names]).toEqual([['p2', { title: 'Designer', company: 'Initech' }], ['p1', { title: 'Software Engineer', company: 'Acme' }]])
  })
})
