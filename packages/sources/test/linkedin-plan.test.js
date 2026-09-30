import { describe, it, expect, vi } from 'vitest'
import { TERMS, MAX_PAGES, SEARCH_BUDGET, DESCRIBE_CAP, planQueries, searchUrl } from '@jobdekho/sources/boards/linkedin-plan.js'
import { politeGet, refusalOf, Refused, GAP_MS, JITTER_MS } from '@jobdekho/sources/boards/linkedin-polite.js'
import { sweep } from '@jobdekho/sources/boards/linkedin-sweep.js'
import { createHttp } from '@jobdekho/sources/http.js'

// A search page of cards with the given ids, in the shape parseLinkedin reads.
const page = (...ids) => ids.map((id) => `<li><div class="base-search-card" data-entity-urn="urn:li:jobPosting:${id}">` +
  `<a class="base-card__full-link" href="https://in.linkedin.com/jobs/view/role-${id}"></a>` +
  `<h3 class="base-search-card__title">Role ${id}</h3></div></li>`).join('')

describe('planQueries', () => {
  it('reads page 0 of every term before page 1 of any', () => {
    const plan = planQueries(['a', 'b', 'c'], 2)
    expect(plan).toEqual([
      { term: 'a', page: 0 }, { term: 'b', page: 0 }, { term: 'c', page: 0 },
      { term: 'a', page: 1 }, { term: 'b', page: 1 }, { term: 'c', page: 1 },
    ])
  })

  it('offers more pages than the budget spends, so an early stop hands pages on', () => {
    expect(planQueries()).toHaveLength(TERMS.length * MAX_PAGES)
    expect(TERMS.length * MAX_PAGES).toBeGreaterThan(SEARCH_BUDGET)
    expect(SEARCH_BUDGET).toBe(60)
    expect(DESCRIBE_CAP).toBe(40)
  })

  // The endpoint ignores f_E, so the level has to be in the words.
  it('names a level in every term and covers the tech families', () => {
    for (const term of TERMS) expect(term).toMatch(/\b(intern|fresher|associate)\b/)
    const all = TERMS.join(' | ')
    for (const family of ['software', 'frontend', 'backend', 'web', 'data', 'machine learning', 'ai', 'devops', 'testing', 'android', 'product']) {
      expect(all).toMatch(new RegExp(`\\b${family}\\b`))
    }
    expect(new Set(TERMS).size).toBe(TERMS.length)
  })
})

describe('searchUrl', () => {
  it('asks for India, the past month, and ten cards from the page start', () => {
    const url = new URL(searchUrl('software engineer intern', 3))
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      keywords: 'software engineer intern', location: 'India', f_TPR: 'r2592000', start: '30',
    })
  })
})

describe('sweep', () => {
  const run = async (answer, options) => {
    const asked = []
    const cards = new Map()
    const get = async (url) => {
      asked.push(url)
      return answer(url, asked.length)
    }
    const used = await sweep(get, cards, options)
    return { asked, cards, used }
  }

  it('dedupes across terms by posting id, keeping the first sighting', async () => {
    const { cards } = await run((url) => (url.includes('keywords=a') ? page(1, 2) : page(2, 3)), { plan: planQueries(['a', 'b'], 1) })
    expect([...cards.keys()]).toEqual(['1', '2', '3'])
  })

  it('stops a term at a page with nothing new, and gives its pages to the others', async () => {
    const { asked, used } = await run(
      (url, n) => (url.includes('keywords=a') ? page(1) : page(100 + n)),
      { plan: planQueries(['a', 'b'], 4), budget: 10 },
    )
    // a: page 0 new, page 1 repeats it and ends a. b reads all four pages.
    expect(asked.filter((u) => u.includes('keywords=a'))).toHaveLength(2)
    expect(asked.filter((u) => u.includes('keywords=b'))).toHaveLength(4)
    expect(used).toBe(6)
  })

  it('stops a term at an empty page', async () => {
    const { asked } = await run((url, n) => (url.includes('start=10') ? '' : page(n)), { plan: planQueries(['a'], 4) })
    expect(asked).toHaveLength(2)
  })

  it('never sends more than the budget', async () => {
    const { asked, used } = await run((url, n) => page(n), { plan: planQueries(['a', 'b', 'c'], 9), budget: 7 })
    expect(asked).toHaveLength(7)
    expect(used).toBe(7)
  })

  it('spends a request on a failed page but keeps going', async () => {
    const { asked, cards } = await run(
      (url, n) => { if (n === 1) throw new Error('HTTP 500 for https://x'); return page(n) },
      { plan: planQueries(['a'], 3) },
    )
    expect(asked).toHaveLength(3)
    expect([...cards.keys()]).toEqual(['2', '3'])
  })

  it('lets a refusal through at once', async () => {
    const answer = (url, n) => { if (n === 2) throw new Refused('HTTP 429'); return page(n) }
    const cards = new Map()
    const get = vi.fn(async (url) => answer(url, get.mock.calls.length))
    await expect(sweep(get, cards, { plan: planQueries(['a', 'b'], 3) })).rejects.toBeInstanceOf(Refused)
    expect(get).toHaveBeenCalledTimes(2)
    expect([...cards.keys()]).toEqual(['1'])
  })
})

describe('refusalOf', () => {
  it('reads 429 and 999 from the error http.js throws', () => {
    expect(refusalOf(new Error('HTTP 429 for https://www.linkedin.com/x'))).toBe('HTTP 429')
    expect(refusalOf(new Error('HTTP 999 for https://www.linkedin.com/x'))).toBe('HTTP 999')
  })

  it('reads nothing else as a refusal', () => {
    expect(refusalOf(new Error('HTTP 503 for https://x'))).toBeNull()
    expect(refusalOf(new Error('HTTP 4290 for https://x'))).toBeNull()
    expect(refusalOf(new Error('This operation was aborted'))).toBeNull()
    expect(refusalOf(undefined)).toBeNull()
  })
})

describe('politeGet', () => {
  const ok = (url) => ({ url, text: async () => 'body' })

  it('asks for html and returns the body', async () => {
    const http = vi.fn(async (url) => ok(url))
    const get = politeGet(http, { wait: async () => {} })
    expect(await get('https://www.linkedin.com/a')).toBe('body')
    expect(http).toHaveBeenCalledWith('https://www.linkedin.com/a', { headers: { Accept: 'text/html' } })
  })

  it('pauses before every request but the first, jittered within the gap', async () => {
    const waits = []
    const draws = [0, 0.5, 0.999]
    const get = politeGet(async (url) => ok(url), { wait: async (ms) => { waits.push(ms) }, random: () => draws.shift() })
    for (let i = 0; i < 4; i++) await get(`https://www.linkedin.com/${i}`)
    expect(waits).toEqual([GAP_MS, GAP_MS + JITTER_MS / 2, GAP_MS + JITTER_MS - 1])
    expect([GAP_MS, JITTER_MS]).toEqual([1500, 1000])
  })

  it('turns 429 and 999 into a refusal and passes any other failure through', async () => {
    const failing = (message) => politeGet(async () => { throw new Error(message) }, { wait: async () => {} })
    await expect(failing('HTTP 429 for https://x')('https://x')).rejects.toBeInstanceOf(Refused)
    await expect(failing('HTTP 999 for https://x')('https://x')).rejects.toThrow('HTTP 999')
    const other = failing('HTTP 404 for https://x')('https://x')
    await expect(other).rejects.not.toBeInstanceOf(Refused)
    await expect(failing('HTTP 404 for https://x')('https://x')).rejects.toThrow('HTTP 404')
  })

  // The refusal is read from http.js's message, so pin the two together
  // rather than trusting a hand-written copy of its wording.
  it('recognises the refusal as the real http.js reports it', async () => {
    for (const status of [429, 999]) {
      const http = createHttp({ fetchImpl: async () => ({ ok: false, status }) })
      const get = politeGet(http, { wait: async () => {} })
      await expect(get('https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/1')).rejects.toThrow(new Refused(`HTTP ${status}`))
    }
  })

  it('treats landing on a sign-in page as a refusal', async () => {
    for (const landed of ['https://www.linkedin.com/authwall?trk=x', 'https://www.linkedin.com/uas/login?session_redirect=y']) {
      const get = politeGet(async () => ok(landed), { wait: async () => {} })
      await expect(get('https://www.linkedin.com/jobs-guest/x')).rejects.toBeInstanceOf(Refused)
    }
  })
})
