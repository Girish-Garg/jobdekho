import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { listPostingsForUser, listSources, setPostingStatus, applyStatusFilter } from '@jobdekho/store/dashboard.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.now()
const ago = (days) => new Date(NOW - days * DAY).toISOString()
const LONG = `We use python and react. ${'Lorem ipsum dolor sit amet. '.repeat(40)}`

let n = 0
function row(over = {}) {
  const id = over.id ?? `p${String(++n).padStart(3, '0')}`
  return {
    id, source: 'internshala', externalId: id, title: 'Software Engineer', company: 'Acme',
    location: 'Bangalore', url: `https://x/${id}`, descriptionSnippet: 'Build things.',
    descriptionText: LONG, tags: [], postedAt: ago(1), firstSeenAt: ago(1), lastSeenAt: ago(0),
    stipend: '10,000', duration: null, experience: null, level: 'mid', degreeMin: 'none',
    degreeRequired: false, workMode: 'onsite', stipendMin: 10000, currency: 'INR',
    durationMonths: null, experienceYears: null, groupKey: null, type: 'job', ...over,
  }
}

function seeded(rows) {
  const store = openStore(dir)
  store.corpus.save(new Map(rows.map((r) => [r.id, r])))
  return store
}

const ids = (postings) => postings.map((p) => p.id)
const PROFILE = { skills: ['python'], titles: ['python developer'], years: 1 }

describe('status', () => {
  it('filters by status before paging, so an actioned row past the first page is found', async () => {
    const store = seeded([row({ id: 'a', postedAt: ago(1) }), row({ id: 'b', postedAt: ago(2) }), row({ id: 'c', postedAt: ago(3) })])
    await setPostingStatus(store, 'me', 'c', 'saved')
    expect(ids(await listPostingsForUser(store, 'me', { status: 'saved', limit: 1 }))).toEqual(['c'])
    expect(ids(await listPostingsForUser(store, 'me', { status: null }))).toEqual(['a', 'b'])
    const all = await listPostingsForUser(store, 'me', {})
    expect(all.map((p) => [p.id, p.status])).toEqual([['a', null], ['b', null], ['c', 'saved']])
  })

  it('is per user', async () => {
    const store = seeded([row({ id: 'a' })])
    await setPostingStatus(store, 'me', 'a', 'applied')
    expect((await listPostingsForUser(store, 'someone-else', {}))[0].status).toBeNull()
  })

  it('setPostingStatus writes statuses.json and null clears the entry', async () => {
    const store = seeded([row({ id: 'a' }), row({ id: 'b' })])
    await setPostingStatus(store, 'me', 'a', 'saved')
    await setPostingStatus(store, 'me', 'b', 'applied')
    await setPostingStatus(store, 'me', 'a', null)
    expect(JSON.parse(readFileSync(join(dir, FILES.statuses), 'utf8'))).toEqual({ me: { b: 'applied' } })
  })

  it('applyStatusFilter normalizes a missing status to null', () => {
    expect(applyStatusFilter([{ id: 'a' }], undefined)).toEqual([{ id: 'a', status: null }])
    expect(applyStatusFilter([{ id: 'a' }, { id: 'b', status: 'saved' }], 'saved')).toEqual([{ id: 'b', status: 'saved' }])
  })
})

describe('groups', () => {
  it('shows one card per group with the count of the rest, and an unkeyed row is its own group', async () => {
    const store = seeded([
      row({ id: 'g1', groupKey: 'role|acme' }), row({ id: 'g2', groupKey: 'role|acme' }), row({ id: 'g3', groupKey: 'role|acme' }),
      row({ id: 'u1', groupKey: null }), row({ id: 'u2', groupKey: null }),
    ])
    const page = await listPostingsForUser(store, 'me', {})
    expect(page).toHaveLength(3)
    expect(Object.fromEntries(page.map((p) => [p.id, p.groupCount]))).toEqual({ g3: 3, u1: 1, u2: 1 })
    expect(await listPostingsForUser(store, 'me', { group: false })).toHaveLength(5)
  })

  it('a company board leads its group over an aggregator, even a newer one', async () => {
    const store = seeded([
      row({ id: 'agg', source: 'linkedin', groupKey: 'k', postedAt: ago(0) }),
      row({ id: 'direct', source: 'greenhouse:acme', groupKey: 'k', postedAt: ago(5) }),
      row({ id: 'agg2', source: 'instahyre', groupKey: 'k', postedAt: ago(0) }),
    ])
    const page = await listPostingsForUser(store, 'me', {})
    expect(page.map((p) => [p.id, p.groupCount])).toEqual([['direct', 3]])
  })

  it('counts only the members that match the filters, across every page', async () => {
    const store = seeded([
      row({ id: 'a', groupKey: 'k', postedAt: ago(1) }), row({ id: 'b', groupKey: 'k', postedAt: ago(2) }),
      row({ id: 'stale', groupKey: 'k', lastSeenAt: ago(40) }), row({ id: 'z', postedAt: ago(9) }),
    ])
    const [lead] = await listPostingsForUser(store, 'me', { limit: 1 })
    expect([lead.id, lead.groupCount]).toEqual(['a', 2])
  })

  it('flags a role blasted across five boards from the distinct source count', async () => {
    const boards = ['linkedin', 'instahyre', 'naukri', 'indeed', 'adzuna']
    const store = seeded(boards.map((source, i) => row({ id: `b${i}`, source, groupKey: 'k' })))
    const [lead] = await listPostingsForUser(store, 'me', {})
    expect(lead.ghostSignals).toContain('listed on 5 job boards')
    expect(lead.groupSourceCount).toBeUndefined()
  })
})

describe('staleness', () => {
  it('hides rows not listed for 21 days, keeps rows that predate the column, and includeStale shows all', async () => {
    const store = seeded([
      row({ id: 'old', lastSeenAt: ago(22) }), row({ id: 'recent', lastSeenAt: ago(20) }), row({ id: 'unknown', lastSeenAt: null }),
    ])
    expect(ids(await listPostingsForUser(store, 'me', {})).sort()).toEqual(['recent', 'unknown'])
    expect(ids(await listPostingsForUser(store, 'me', { includeStale: true })).sort()).toEqual(['old', 'recent', 'unknown'])
  })
})

describe('ranking', () => {
  it('ignores minFit when the profile cannot be ranked and falls back to newest', async () => {
    const store = seeded([row({ id: 'a', postedAt: ago(2) }), row({ id: 'b', postedAt: ago(1) })])
    const page = await listPostingsForUser(store, 'me', { sort: 'match', profile: {}, minFit: 90 })
    expect(ids(page)).toEqual(['b', 'a'])
    for (const p of page) {
      expect(p.matchScore).toBe(0)
      expect(p).not.toHaveProperty('fit')
      expect(p).not.toHaveProperty('grade')
      expect(p).toHaveProperty('legitimacy')
      expect(p).toHaveProperty('ghostSignals')
    }
    expect(ids(await listPostingsForUser(store, 'me', { sort: 'match', minFit: 90 }))).toEqual(['b', 'a'])
  })

  it('applies minFit against the real score when the profile ranks', async () => {
    const store = seeded([
      row({ id: 'py', title: 'Python Developer', level: 'entry' }),
      row({ id: 'chef', title: 'Chef', descriptionText: 'Cook. '.repeat(60), level: 'executive' }),
    ])
    const page = await listPostingsForUser(store, 'me', { sort: 'match', profile: PROFILE, minFit: 50 })
    expect(ids(page)).toEqual(['py'])
    const [py] = page
    expect(py.fit).toBeGreaterThanOrEqual(50)
    expect(py.matchScore).toBe(py.fit)
    expect(py.grade).toMatch(/^[ABCD]$/)
    expect(py.reasons).toContain('matches python')
    expect(py.breakdown).toBeTruthy()
    expect(py.legitimacy).toBeTruthy()
  })

  // The bug this guards: the floor was applied only under Best fit, so
  // "Fit B or better" under Newest showed every row, unscored, and the feed
  // asked a person with a full profile to set one up.
  it('scores and applies minFit under every order, keeping that order', async () => {
    const store = seeded([
      row({ id: 'old-py', title: 'Python Developer', level: 'entry', firstSeenAt: ago(5), postedAt: ago(5) }),
      row({ id: 'chef', title: 'Chef', descriptionText: 'Cook. '.repeat(60), level: 'executive' }),
      row({ id: 'new-py', title: 'Python Developer', level: 'entry', firstSeenAt: ago(0), postedAt: ago(0) }),
    ])
    const page = await listPostingsForUser(store, 'me', { sort: 'newest', profile: PROFILE, minFit: 50 })
    expect(ids(page)).toEqual(['new-py', 'old-py'])
    expect(page.every((p) => Number.isInteger(p.fit) && /^[ABCD]$/.test(p.grade))).toBe(true)
    const all = await listPostingsForUser(store, 'me', { sort: 'company', profile: PROFILE })
    expect(all).toHaveLength(3)
    expect(all.every((p) => Number.isInteger(p.fit))).toBe(true)
  })

  it('orders by fit, then newest, then id', async () => {
    const store = seeded([
      row({ id: 'chef', title: 'Chef', level: 'executive', postedAt: ago(0) }),
      row({ id: 'py-old', title: 'Python Developer', level: 'entry', postedAt: ago(5) }),
      row({ id: 'py-new', title: 'Python Developer', level: 'entry', postedAt: ago(1) }),
    ])
    const page = await listPostingsForUser(store, 'me', { sort: 'match', profile: PROFILE })
    expect(ids(page)).toEqual(['py-new', 'py-old', 'chef'])
  })

  it('never returns descriptionText or query scaffolding, ranked or not', async () => {
    const store = seeded([row({ id: 'a', groupKey: 'k' })])
    for (const opts of [{}, { sort: 'match', profile: PROFILE }]) {
      const [p] = await listPostingsForUser(store, 'me', opts)
      for (const key of ['descriptionText', 'groupRank', 'groupSourceCount', 'externalId', 'groupKey', 'currency']) {
        expect(p).not.toHaveProperty(key)
      }
      expect(p.descriptionSnippet).toBe('Build things.')
    }
  })
})

describe('ordering', () => {
  it('newest puts undated postings last', async () => {
    const store = seeded([row({ id: 'undated', postedAt: null }), row({ id: 'old', postedAt: ago(9) }), row({ id: 'new', postedAt: ago(1) })])
    expect(ids(await listPostingsForUser(store, 'me', {}))).toEqual(['new', 'old', 'undated'])
    expect(ids(await listPostingsForUser(store, 'me', { sort: 'oldest' }))).toEqual(['old', 'new', 'undated'])
  })

  it('company sorts case-insensitively and added sorts by firstSeenAt', async () => {
    const store = seeded([
      row({ id: 'z', company: 'zeta', firstSeenAt: ago(3) }), row({ id: 'a', company: 'Alpha', firstSeenAt: ago(1) }),
      row({ id: 'b', company: 'beta', firstSeenAt: ago(2) }),
    ])
    expect(ids(await listPostingsForUser(store, 'me', { sort: 'company' }))).toEqual(['a', 'b', 'z'])
    expect(ids(await listPostingsForUser(store, 'me', { sort: 'added' }))).toEqual(['a', 'b', 'z'])
  })

  it('breaks a shared timestamp by id so a page never slices a tie arbitrarily', async () => {
    const store = seeded([row({ id: 'p1', postedAt: ago(1) }), row({ id: 'p2', postedAt: ago(1) }), row({ id: 'p3', postedAt: ago(1) })])
    expect(ids(await listPostingsForUser(store, 'me', { limit: 2 }))).toEqual(['p3', 'p2'])
    expect(ids(await listPostingsForUser(store, 'me', { limit: 2, offset: 2 }))).toEqual(['p1'])
  })
})

describe('filters', () => {
  it('expands a search over the title but matches the company literally', async () => {
    const store = seeded([
      row({ id: 'fe', title: 'Frontend Developer', company: 'Acme' }),
      row({ id: 'kitchen', title: 'Chef', company: 'Web Dev Kitchen' }),
      row({ id: 'ds', title: 'Data Scientist', company: 'Frontend Ltd' }),
    ])
    expect(ids(await listPostingsForUser(store, 'me', { q: 'web dev' })).sort()).toEqual(['fe', 'kitchen'])
    expect(ids(await listPostingsForUser(store, 'me', { q: 'SCIENT' }))).toEqual(['ds'])
  })

  it('applies sources, a single source, excluded sources, levels, work modes and degree', async () => {
    const store = seeded([
      row({ id: 'a', source: 'internshala', level: 'internship', workMode: 'remote', degreeMin: 'none' }),
      row({ id: 'b', source: 'linkedin', level: 'senior', workMode: 'onsite', degreeMin: 'masters' }),
      row({ id: 'c', source: 'greenhouse:acme', level: 'entry', workMode: 'hybrid', degreeMin: 'bachelors' }),
    ])
    const list = (opts) => listPostingsForUser(store, 'me', opts).then(ids).then((x) => x.sort())
    expect(await list({ sources: ['linkedin', 'internshala'] })).toEqual(['a', 'b'])
    expect(await list({ source: 'linkedin' })).toEqual(['b'])
    expect(await list({ sources: ['linkedin'], source: 'internshala' })).toEqual(['b'])
    expect(await list({ excludedSources: ['linkedin'] })).toEqual(['a', 'c'])
    expect(await list({ levels: ['internship', 'entry'] })).toEqual(['a', 'c'])
    expect(await list({ workModes: ['remote'] })).toEqual(['a'])
    expect(await list({ maxDegree: 'bachelors' })).toEqual(['a', 'c'])
  })

  it('coerces the measure floors from the strings the query carries', async () => {
    const store = seeded([
      row({ id: 'paid', stipendMin: 20000, durationMonths: 3, experienceYears: null }),
      row({ id: 'unpaid', stipendMin: null, durationMonths: 6, experienceYears: 5 }),
    ])
    expect(ids(await listPostingsForUser(store, 'me', { minStipend: '15000' }))).toEqual(['paid'])
    expect(ids(await listPostingsForUser(store, 'me', { maxDurationMonths: '4' }))).toEqual(['paid'])
    expect(ids(await listPostingsForUser(store, 'me', { maxExperienceYears: '2' }))).toEqual(['paid'])
  })

  it('pages with limit and offset and clamps a limit above the cap', async () => {
    const store = seeded(Array.from({ length: 5 }, (_, i) => row({ id: `p${i}`, postedAt: ago(i) })))
    expect(ids(await listPostingsForUser(store, 'me', { limit: 2, offset: 1 }))).toEqual(['p1', 'p2'])
    expect(ids(await listPostingsForUser(store, 'me', { limit: '9999', offset: 'x' }))).toHaveLength(5)
  })
})

describe('listSources', () => {
  it('counts the whole corpus, most listings first', async () => {
    const store = seeded([row({ source: 'b' }), row({ source: 'a' }), row({ source: 'a' }), row({ source: 'c', lastSeenAt: ago(90) })])
    expect(await listSources(store)).toEqual([{ name: 'a', count: 2 }, { name: 'b', count: 1 }, { name: 'c', count: 1 }])
  })
})

// The feed's title line reads these, not the loaded page: counting the page
// said "100 new today" whenever its first hundred rows were new.
describe('counts beside the page', () => {
  it('gives the whole match size and how many arrived in the last day', async () => {
    const store = seeded([
      row({ id: 'n1', firstSeenAt: ago(0) }), row({ id: 'n2', firstSeenAt: ago(0) }),
      row({ id: 'o1', firstSeenAt: ago(3) }), row({ id: 'o2', firstSeenAt: ago(5) }),
    ])
    const out = await listPostingsForUser(store, 'me', { sort: 'newest', limit: 1, withCounts: true })
    expect(out.postings).toHaveLength(1)
    expect(out).toMatchObject({ total: 4, newToday: 2 })
  })

  it('stays a plain list for callers that did not ask for counts', async () => {
    const store = seeded([row({ id: 'n1' })])
    expect(Array.isArray(await listPostingsForUser(store, 'me', { sort: 'newest' }))).toBe(true)
  })
})
