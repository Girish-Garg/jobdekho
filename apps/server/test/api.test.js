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
    getProfile: vi.fn().mockResolvedValue({ skills: ['react'], years: 2, degree: 'bachelors' }),
    upsertProfile: vi.fn().mockResolvedValue({}),
    deleteProfile: vi.fn().mockResolvedValue(undefined),
    getUserFilters: vi.fn().mockResolvedValue(null),
    upsertUserFilters: vi.fn().mockResolvedValue(undefined),
    getNotificationPrefs: vi.fn().mockResolvedValue(null),
    upsertNotificationPrefs: vi.fn().mockResolvedValue(undefined),
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

const NO_OPTS = {
  source: undefined, sources: undefined, excludedSources: undefined,
  q: undefined, status: undefined, sort: undefined, profile: undefined,
  levels: undefined, workModes: undefined, maxDegree: undefined,
  minStipend: undefined, maxDurationMonths: undefined, maxExperienceYears: undefined,
  includeStale: false, limit: undefined, offset: undefined,
}

async function optsFor(store, url) {
  const app = makeApp(store)
  const cookie = await signedCookie(app)
  await app.inject({ method: 'GET', url, headers: { cookie } })
  return store.listPostingsForUser.mock.calls.at(-1)[1]
}

describe('GET /api/postings', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/postings' })
    expect(res.statusCode).toBe(401)
  })

  it('returns { postings } for authenticated user', async () => {
    const store = makeFakeStore()
    store.listPostingsForUser.mockResolvedValue([{ id: '1', title: 'Dev', status: null }])
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/postings', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ postings: [{ id: '1', title: 'Dev', status: null }] })
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

  it('passes a known sort and ignores an unknown one', async () => {
    const store = makeFakeStore()
    expect((await optsFor(store, '/api/postings?sort=company')).sort).toBe('company')
    expect((await optsFor(store, '/api/postings?sort=nonsense')).sort).toBeUndefined()
  })

  it('reads includeStale as a boolean', async () => {
    const store = makeFakeStore()
    expect((await optsFor(store, '/api/postings?includeStale=true')).includeStale).toBe(true)
    expect((await optsFor(store, '/api/postings')).includeStale).toBe(false)
  })

  // The profile is only fetched for the sort that needs it.
  it('loads the profile only for the match sort', async () => {
    const store = makeFakeStore()
    await optsFor(store, '/api/postings?sort=match')
    expect(store.getProfile).toHaveBeenCalled()
    store.getProfile.mockClear()
    await optsFor(store, '/api/postings?sort=newest')
    expect(store.getProfile).not.toHaveBeenCalled()
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
})

describe('GET /api/notifications', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'GET', url: '/api/notifications' })
    expect(res.statusCode).toBe(401)
  })

  it('returns defaults when store returns null', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/notifications', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ channel: 'none', telegramChatId: null, enabled: true })
  })

  it('returns user prefs when available', async () => {
    const store = makeFakeStore()
    store.getNotificationPrefs.mockResolvedValue({ channel: 'telegram', telegramChatId: '123', enabled: true })
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const res = await app.inject({ method: 'GET', url: '/api/notifications', headers: { cookie } })
    expect(res.statusCode).toBe(200)
    expect(res.json().channel).toBe('telegram')
  })
})

describe('PUT /api/notifications', () => {
  it('returns 401 without cookie', async () => {
    const app = makeApp(makeFakeStore()); await app.ready()
    const res = await app.inject({ method: 'PUT', url: '/api/notifications', body: {} })
    expect(res.statusCode).toBe(401)
  })

  it('calls upsertNotificationPrefs and returns 204', async () => {
    const store = makeFakeStore()
    const app = makeApp(store)
    const cookie = await signedCookie(app)
    const prefs = { channel: 'telegram', telegramChatId: 'chat123', enabled: true }
    const res = await app.inject({
      method: 'PUT', url: '/api/notifications',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    expect(res.statusCode).toBe(204)
    expect(store.upsertNotificationPrefs).toHaveBeenCalledWith('u1', prefs)
  })
})
