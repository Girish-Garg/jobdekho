import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '@jobdekho/server/app.js'

const config = {
  googleClientId: 'id',
  googleClientSecret: 'sec',
  sessionSecret: 'test-secret',
  baseUrl: 'http://localhost:3000',
}

function makeFakeStore() {
  return {
    listPostingsForUser: vi.fn().mockResolvedValue([]),
    setPostingStatus: vi.fn().mockResolvedValue(undefined),
    listSources: vi.fn().mockResolvedValue([{ name: 'internshala', count: 878 }]),
    listCompanyCounts: vi.fn().mockResolvedValue([{ name: 'Razorpay', count: 12, picked: [] }]),
    getProfile: vi.fn().mockResolvedValue({ skills: ['react'], years: 2, degree: 'bachelors' }),
    getResumeText: vi.fn().mockResolvedValue(null),
    upsertProfile: vi.fn().mockResolvedValue({}),
    deleteProfile: vi.fn().mockResolvedValue(undefined),
    getUserFilters: vi.fn().mockResolvedValue(null),
    upsertUserFilters: vi.fn().mockResolvedValue(undefined),
  }
}

function makeApp(store) {
  const userStore = { upsertUser: vi.fn(), getUserById: vi.fn() }
  return buildApp({ config, userStore, fetchProfile: vi.fn(), dashboardStore: store })
}

async function signedCookie(app) {
  await app.ready()
  const token = app.jwt.sign({ sub: 'u1', email: 'a@b.c', name: 'A', avatarUrl: null })
  return `session=${token}`
}

// The no-options request now defaults to the ranked sort, so it carries the
// profile the fake store serves and an unset fit floor.
const NO_OPTS = {
  source: undefined, sources: undefined, excludedSources: undefined, companies: undefined,
  q: undefined, status: undefined, sort: 'match',
  profile: { skills: ['react'], years: 2, degree: 'bachelors' }, minFit: undefined,
  levels: undefined, workModes: undefined, maxDegree: undefined,
  minStipend: undefined, maxDurationMonths: undefined, maxExperienceYears: undefined,
  includeStale: false, limit: undefined, offset: undefined, withCounts: true,
}

async function optsFor(store, url) {
  const app = makeApp(store)
  const cookie = await signedCookie(app)
  await app.inject({ method: 'GET', url, headers: { cookie } })
  return store.listPostingsForUser.mock.calls.at(-1)[1]
}

// Picked by name, any number of them; the store matches each by its key.
describe('the company filter', () => {
  it('passes the picked names through, a comma inside one arriving as a space', async () => {
    const opts = await optsFor(makeFakeStore(), '/api/postings?companies=Razorpay,Acme%20%20Inc.')
    expect(opts.companies).toEqual(['Razorpay', 'Acme  Inc.'])
  })

  it('lists the companies under the same query the feed reads, picks included', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/companies?levels=entry&companies=Razorpay&status=new', headers: { cookie } })
    expect(res.json()).toEqual({ companies: [{ name: 'Razorpay', count: 12, picked: [] }] })
    const [user, opts] = store.listCompanyCounts.mock.calls[0]
    expect(user).toBe('u1')
    expect(opts).toMatchObject({ levels: ['entry'], companies: ['Razorpay'], status: null, profile: { skills: ['react'] } })
  })

  it('answers no one without a session', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    expect((await app.inject({ method: 'GET', url: '/api/companies' })).statusCode).toBe(401)
  })
})

describe('GET /api/postings', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/postings' })
    expect(res.statusCode).toBe(401)
  })

  // The page comes with the whole match's size and how many are new today,
  // which the title line reads rather than counting the loaded page.
  it('returns the page with the match counts for the authenticated user', async () => {
    const store = makeFakeStore()
    store.listPostingsForUser.mockResolvedValue({ postings: [{ id: '1', title: 'Dev', status: null }], total: 1, newToday: 0 })
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/postings', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ postings: [{ id: '1', title: 'Dev', status: null }], total: 1, newToday: 0 })
    expect(store.listPostingsForUser).toHaveBeenCalledWith('u1', NO_OPTS)
  })

  it('maps ?status=new to null in store call', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    await app.inject({ method: 'GET', url: '/api/postings?status=new', headers: { cookie } })
    expect(store.listPostingsForUser).toHaveBeenCalledWith('u1', { ...NO_OPTS, status: null })
  })

  it('passes literal status values through', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    await app.inject({ method: 'GET', url: '/api/postings?status=saved&source=naukri&q=react', headers: { cookie } })
    expect(store.listPostingsForUser).toHaveBeenCalledWith('u1',
      { ...NO_OPTS, source: 'naukri', q: 'react', status: 'saved' })
  })

  it('splits ?levels on commas', async () => {
    const opts = await optsFor(makeFakeStore(), '/api/postings?levels=entry,mid,senior')
    expect(opts.levels).toEqual(['entry', 'mid', 'senior'])
  })

  it('trims whitespace around level names', async () => {
    const opts = await optsFor(makeFakeStore(), '/api/postings?levels=entry,%20senior')
    expect(opts.levels).toEqual(['entry', 'senior'])
  })

  it('silently drops unknown levels', async () => {
    const opts = await optsFor(makeFakeStore(), '/api/postings?levels=entry,wizard,SENIOR')
    expect(opts.levels).toEqual(['entry'])
  })

  it('drops the levels option entirely when nothing valid remains', async () => {
    const opts = await optsFor(makeFakeStore(), '/api/postings?levels=wizard,,')
    expect(opts.levels).toBeUndefined()
  })

  it('passes a known maxDegree through', async () => {
    const opts = await optsFor(makeFakeStore(), '/api/postings?maxDegree=bachelors')
    expect(opts.maxDegree).toBe('bachelors')
  })

  it('silently drops an unknown maxDegree', async () => {
    const opts = await optsFor(makeFakeStore(), '/api/postings?maxDegree=bootcamp')
    expect(opts.maxDegree).toBeUndefined()
  })

  it('parses limit and offset as numbers', async () => {
    const opts = await optsFor(makeFakeStore(), '/api/postings?limit=25&offset=50')
    expect(opts.limit).toBe(25)
    expect(opts.offset).toBe(50)
  })

  it('drops non-numeric or negative paging values', async () => {
    const opts = await optsFor(makeFakeStore(), '/api/postings?limit=abc&offset=-5')
    expect(opts.limit).toBeUndefined()
    expect(opts.offset).toBeUndefined()
  })

  it('still answers 200 when every new param is junk', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({
      method: 'GET', url: '/api/postings?levels=x&maxDegree=y&limit=z&offset=w',
      headers: { cookie },
    })
    expect(res.statusCode).toBe(200)
  })
})

// Every one of these was destructured from the query string and then quietly
// dropped before the store call, so the UI could send them and nothing changed.
describe('GET /api/postings forwards every option', () => {
  it('passes the measure filters through as given', async () => {
    const store = makeFakeStore()
    const opts = await optsFor(store, '/api/postings?minStipend=15000&maxDurationMonths=6&maxExperienceYears=2')
    expect(opts.minStipend).toBe('15000')
    expect(opts.maxDurationMonths).toBe('6')
    expect(opts.maxExperienceYears).toBe('2')
  })

  it('passes a known sort through', async () => {
    const store = makeFakeStore()
    expect((await optsFor(store, '/api/postings?sort=company')).sort).toBe('company')
  })

  // Recommended is the default, and unknown sorts land on it too, so a stale
  // bookmarked URL still returns results instead of erroring.
  it('defaults to the match sort, for no sort and for an unknown one', async () => {
    const store = makeFakeStore()
    expect((await optsFor(store, '/api/postings')).sort).toBe('match')
    expect((await optsFor(store, '/api/postings?sort=nonsense')).sort).toBe('match')
  })

  it('passes an in-range minFit and drops anything off the 0-100 scale', async () => {
    const store = makeFakeStore()
    expect((await optsFor(store, '/api/postings?minFit=60')).minFit).toBe(60)
    expect((await optsFor(store, '/api/postings?minFit=0')).minFit).toBe(0)
    expect((await optsFor(store, '/api/postings?minFit=101')).minFit).toBeUndefined()
    expect((await optsFor(store, '/api/postings?minFit=-5')).minFit).toBeUndefined()
    expect((await optsFor(store, '/api/postings?minFit=high')).minFit).toBeUndefined()
  })

  it('reads includeStale as a boolean', async () => {
    const store = makeFakeStore()
    expect((await optsFor(store, '/api/postings?includeStale=true')).includeStale).toBe(true)
    expect((await optsFor(store, '/api/postings')).includeStale).toBe(false)
  })

  // The profile is only fetched for the sort that needs it - which the
  // default now is, so a bare request loads it too.
  // Every order shows the fit and honours its floor, so every order needs
  // the profile; loading it only for Best fit made the floor a no-op.
  it('loads the profile for every sort', async () => {
    const store = makeFakeStore()
    await optsFor(store, '/api/postings?sort=match')
    expect(store.getProfile).toHaveBeenCalled()
    store.getProfile.mockClear()
    await optsFor(store, '/api/postings')
    expect(store.getProfile).toHaveBeenCalled()
    store.getProfile.mockClear()
    await optsFor(store, '/api/postings?sort=newest&minFit=50')
    expect(store.getProfile).toHaveBeenCalled()
  })
})

describe('GET /api/sources', () => {
  it('returns 401 without a cookie', async () => {
    const res = await makeApp(makeFakeStore()).inject({ method: 'GET', url: '/api/sources' })
    expect(res.statusCode).toBe(401)
  })

  it('lists sources with their counts', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/sources', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ sources: [{ name: 'internshala', count: 878 }] })
  })
})

describe('GET /api/postings sources filter', () => {
  it('splits a comma separated list', async () => {
    const store = makeFakeStore()
    const opts = await optsFor(store, '/api/postings?sources=internshala,unstop')
    expect(opts.sources).toEqual(['internshala', 'unstop'])
  })

  it('trims blanks and drops an all-empty list', async () => {
    const store = makeFakeStore()
    expect((await optsFor(store, '/api/postings?sources=a%20,%20,b')).sources).toEqual(['a', 'b'])
    expect((await optsFor(store, '/api/postings?sources=%20,%20')).sources).toBeUndefined()
  })
})

async function patchStatus(store, body) {
  const app = makeApp(store)
  const cookie = await signedCookie(app)
  return app.inject({
    method: 'PATCH', url: '/api/postings/p1',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/postings/:id', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'PATCH', url: '/api/postings/p1', body: { status: 'saved' } })
    expect(res.statusCode).toBe(401)
  })

  it('calls setPostingStatus and returns 204', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({
      method: 'PATCH', url: '/api/postings/p1',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'applied' }),
    })
    expect(res.statusCode).toBe(204)
    expect(store.setPostingStatus).toHaveBeenCalledWith('u1', 'p1', 'applied')
  })

  it.each(['saved', 'applied', 'dismissed'])('accepts the real status "%s"', async (status) => {
    const store = makeFakeStore()
    const res = await patchStatus(store, { status })
    expect(res.statusCode).toBe(204)
    expect(store.setPostingStatus).toHaveBeenCalledWith('u1', 'p1', status)
  })

  // Clicking an active Save button again clears it. That is a real request
  // shape, not a missing field, so null has to reach the store as null.
  it('clears the status when sent null', async () => {
    const store = makeFakeStore()
    const res = await patchStatus(store, { status: null })
    expect(res.statusCode).toBe(204)
    expect(store.setPostingStatus).toHaveBeenCalledWith('u1', 'p1', null)
  })

  it('rejects a status outside the real vocabulary', async () => {
    const store = makeFakeStore()
    const res = await patchStatus(store, { status: 'archived' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBeTruthy()
    expect(store.setPostingStatus).not.toHaveBeenCalled()
  })

  it('rejects a body with no status field', async () => {
    const res = await patchStatus(makeFakeStore(), {})
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 instead of 500 for a request with no body', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'PATCH', url: '/api/postings/p1', headers: { cookie } })
    expect(res.statusCode).toBe(400)
    expect(store.setPostingStatus).not.toHaveBeenCalled()
  })
})

describe('GET /api/filters', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/filters' })
    expect(res.statusCode).toBe(401)
  })

  it('falls back to global defaults when store returns null', async () => {
    const store = makeFakeStore() // getUserFilters returns null
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/filters', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(Array.isArray(body.includeKeywords)).toBe(true)
    expect(Array.isArray(body.excludeKeywords)).toBe(true)
    expect(Array.isArray(body.locations)).toBe(true)
    expect(Array.isArray(body.levels)).toBe(true)
    expect(body).toHaveProperty('maxDegree')
    expect(body.includeKeywords.length).toBeGreaterThan(0)
  })

  it('returns user filters when available', async () => {
    const store = makeFakeStore()
    store.getUserFilters.mockResolvedValue({ includeKeywords: ['react'], excludeKeywords: [], locations: ['remote'] })
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/filters', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ includeKeywords: ['react'], excludeKeywords: [], locations: ['remote'] })
  })
})

describe('PUT /api/filters', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'PUT', url: '/api/filters', body: {} })
    expect(res.statusCode).toBe(401)
  })

  async function putFilters(store, body) {
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({
      method: 'PUT', url: '/api/filters',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { res, saved: store.upsertUserFilters.mock.calls.at(-1)?.[1] }
  }

  it('calls upsertUserFilters and returns 204', async () => {
    const store = makeFakeStore()
    const filters = { includeKeywords: ['node'], excludeKeywords: ['senior'], locations: ['remote'] }
    const { res, saved } = await putFilters(store, filters)
    expect(res.statusCode).toBe(204)
    expect(saved).toMatchObject(filters)
  })

  it('persists the level, degree and numeric fields', async () => {
    const { saved } = await putFilters(makeFakeStore(), {
      levels: ['entry', 'senior'], maxDegree: 'masters',
      minStipend: 20000, maxDurationMonths: 6, maxExperienceYears: 3,
    })
    expect(saved.levels).toEqual(['entry', 'senior'])
    expect(saved.maxDegree).toBe('masters')
    expect(saved.minStipend).toBe(20000)
    expect(saved.maxDurationMonths).toBe(6)
    expect(saved.maxExperienceYears).toBe(3)
  })

  it('drops unknown levels and degrees before persisting', async () => {
    const { saved } = await putFilters(makeFakeStore(), { levels: ['entry', 'wizard'], maxDegree: 'bootcamp' })
    expect(saved.levels).toEqual(['entry'])
    expect(saved.maxDegree).toBeNull()
  })

  it('fills the array columns when the body omits them', async () => {
    const { saved } = await putFilters(makeFakeStore(), {})
    expect(saved.levels).toEqual([])
    expect(saved.locations).toEqual([])
    expect(saved.minStipend).toBeNull()
  })

  it('rejects a non-object body before it reaches coerceFilters', async () => {
    const store = makeFakeStore()
    const { res } = await putFilters(store, ['not', 'an', 'object'])
    expect(res.statusCode).toBe(400)
    expect(store.upsertUserFilters).not.toHaveBeenCalled()
  })

  it('returns 400 instead of 500 for a request with no body', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'PUT', url: '/api/filters', headers: { cookie } })
    expect(res.statusCode).toBe(400)
    expect(store.upsertUserFilters).not.toHaveBeenCalled()
  })
})

describe('PUT /api/profile', () => {
  async function putProfile(store, body) {
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    return app.inject({
      method: 'PUT', url: '/api/profile',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'PUT', url: '/api/profile', body: {} })
    expect(res.statusCode).toBe(401)
  })

  // The stored resume rides along with the edit because the store replaces
  // every column; with nothing stored, that is a pair of nulls.
  it('calls upsertProfile and returns its result', async () => {
    const store = makeFakeStore()
    store.upsertProfile.mockResolvedValue({ skills: ['react'], years: 2 })
    const res = await putProfile(store, { skills: ['react'], years: 2 })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ skills: ['react'], years: 2 })
    expect(store.upsertProfile).toHaveBeenCalledWith('u1', { skills: ['react'], years: 2, resumeText: null, resumeName: null })
  })

  it('rejects a non-object body before it reaches normalizeProfile', async () => {
    const store = makeFakeStore()
    const res = await putProfile(store, 'not an object')
    expect(res.statusCode).toBe(400)
    expect(store.upsertProfile).not.toHaveBeenCalled()
  })

  it('returns 400 instead of 500 for a request with no body', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'PUT', url: '/api/profile', headers: { cookie } })
    expect(res.statusCode).toBe(400)
    expect(store.upsertProfile).not.toHaveBeenCalled()
  })
})

// A DB error message can name real columns and constraints. The client only
// ever gets to see that a 5xx happened, never why.
describe('the global error handler', () => {
  it('hides a thrown 5xx error behind a generic message', async () => {
    const store = makeFakeStore()
    store.setPostingStatus.mockRejectedValue(
      new Error('column "status" violates check constraint "user_postings_status_check"'))
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({
      method: 'PATCH', url: '/api/postings/p1',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'saved' }),
    })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: 'internal server error' })
    expect(res.body).not.toMatch(/check constraint/)
  })

  it('still returns 401 unchanged for an unauthenticated request', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/postings' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({ error: 'unauthorized' })
  })

  it('still returns 404 unchanged for an unknown route', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/nope' })
    expect(res.statusCode).toBe(404)
  })

  it('keeps a schema validation message specific enough to name the field', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({
      method: 'PATCH', url: '/api/postings/p1',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toMatch(/status/)
  })
})
