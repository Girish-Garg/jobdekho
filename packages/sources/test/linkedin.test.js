import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { linkedin, parseLinkedin } from '@jobdekho/sources/boards/linkedin.js'
import { TERMS, SEARCH_BUDGET, DESCRIBE_CAP } from '@jobdekho/sources/boards/linkedin-plan.js'

// Trimmed from a live seeMoreJobPostings response. Each <li> is one
// base-search-card whose link carries a title slug, the posting id, and a
// query string of per-impression tracking tokens that differs on every request.
const html = `<!DOCTYPE html>
<li>
  <div class="base-card relative w-full hover:no-underline focus:no-underline base-card--link base-search-card base-search-card--link job-search-card" data-entity-urn="urn:li:jobPosting:4454591390" data-impression-id="jobs-search-result-0" data-reference-id="RaEjYAHNaQ0OEcHzSywoVg==" data-tracking-id="TiQBVl+sXpYLlNTtiHmgNQ==" data-column="1" data-row="1">
    <a class="base-card__full-link absolute top-0 right-0 bottom-0 left-0 p-0 z-[2] outline-offset-[4px]" href="https://in.linkedin.com/jobs/view/custom-software-engineer-at-accenture-in-india-4454591390?position=1&amp;pageNum=0&amp;refId=RaEjYAHNaQ0OEcHzSywoVg%3D%3D&amp;trackingId=TiQBVl%2BsXpYLlNTtiHmgNQ%3D%3D" data-tracking-control-name="public_jobs_jserp-result_search-card" data-tracking-will-navigate>
      <span class="sr-only">
        Custom Software Engineer
      </span>
    </a>
    <div class="search-entity-media">
      <img class="artdeco-entity-image artdeco-entity-image--square-4" data-delayed-url="https://media.licdn.com/dms/image/v2/D4E0BAQHYzTce8ZeOzw/company-logo_100_100/0/accentureindia_logo" data-ghost-classes="artdeco-entity-image--ghost" alt>
    </div>
    <div class="base-search-card__info">
      <h3 class="base-search-card__title">

        Custom Software Engineer

      </h3>
      <h4 class="base-search-card__subtitle">
        <a class="hidden-nested-link" data-tracking-client-ingraph data-tracking-control-name="public_jobs_jserp-result_job-search-card-subtitle" data-tracking-will-navigate href="https://in.linkedin.com/company/accentureindia?trk=public_jobs_jserp-result_job-search-card-subtitle">
          Accenture in India
        </a>
      </h4>
      <div class="base-search-card__metadata">
        <span class="job-search-card__location">
          Ahmedabad, Gujarat, India
        </span>
        <div class="job-posting-benefits text-sm">
          <icon class="job-posting-benefits__icon" data-delayed-url="https://static.licdn.com/aero-v1/sc/h/3p1v0uhy7uq0cm5zdvzp4eo18"></icon>
          <span class="job-posting-benefits__text">
            Actively Hiring
          </span>
        </div>
        <time class="job-search-card__listdate" datetime="2026-09-01">

          4 days ago

        </time>
      </div>
    </div>
  </div>
</li>
<li>
  <div class="base-card relative w-full base-card--link base-search-card base-search-card--link job-search-card" data-entity-urn="urn:li:jobPosting:4462169710" data-impression-id="jobs-search-result-7">
    <a class="base-card__full-link absolute top-0 right-0 bottom-0 left-0 p-0 z-[2] outline-offset-[4px]" href="https://in.linkedin.com/jobs/view/software-engineer-at-mailercloud-4462169710?position=8&amp;pageNum=0&amp;refId=x&amp;trackingId=y" data-tracking-control-name="public_jobs_jserp-result_search-card">
      <span class="sr-only">Software Engineer</span>
    </a>
    <div class="base-search-card__info">
      <h3 class="base-search-card__title">Software Engineer</h3>
      <h4 class="base-search-card__subtitle">
        <a class="hidden-nested-link" href="https://in.linkedin.com/company/mailercloud?trk=public_jobs_jserp-result_job-search-card-subtitle">Mailercloud</a>
      </h4>
      <div class="base-search-card__metadata">
        <span class="job-search-card__location">Kochi, Kerala, India</span>
        <time class="job-search-card__listdate--new" datetime="2026-09-02">3 days ago</time>
      </div>
    </div>
  </div>
</li>`

describe('parseLinkedin', () => {
  it('maps a card', () => {
    const [r] = parseLinkedin(html)
    expect(r).toMatchObject({
      externalId: '4454591390',
      title: 'Custom Software Engineer',
      company: 'Accenture in India',
      location: 'Ahmedabad, Gujarat, India',
      description: '',
      tags: [],
    })
    expect(r.postedAt).toMatch(/^2026-09-01T/)
    expect(r.level).toBeUndefined()
  })

  // refId and trackingId are per-impression tokens, so the raw href is a
  // different string every time the same posting is seen.
  it('drops the tracking query from the url', () => {
    expect(parseLinkedin(html)[0].url)
      .toBe('https://in.linkedin.com/jobs/view/custom-software-engineer-at-accenture-in-india-4454591390')
  })

  // The selector keys on the datetime attribute, not the listdate class, so a
  // renamed or variant class cannot silently blank every date.
  it('reads the date by attribute whatever the class', () => {
    const rows = parseLinkedin(html)
    expect(rows).toHaveLength(2)
    expect(rows[1].externalId).toBe('4462169710')
    expect(rows[1].postedAt).toMatch(/^2026-09-02T/)
  })

  it('falls back to the id in the view link when the urn is missing', () => {
    const noUrn = html.replace(/ data-entity-urn="[^"]+"/g, '')
    expect(parseLinkedin(noUrn).map((r) => r.externalId)).toEqual(['4454591390', '4462169710'])
  })

  it('skips a card with neither an id nor a title', () => {
    expect(parseLinkedin('<li><div class="base-search-card"></div></li>')).toEqual([])
  })

  it('returns nothing for an empty body', () => {
    expect(parseLinkedin('')).toEqual([])
  })
})

// Trimmed captures of the two endpoints, with fictional companies and text.
const searchPage = readFileSync(new URL('./fixtures/linkedin-search-page.html', import.meta.url), 'utf8')
const jobView = readFileSync(new URL('./fixtures/linkedin-job-view.html', import.meta.url), 'utf8')

// The fixture's three cards under ids no other page shares, so a sweep that
// reads a different page on every request never sees a repeat.
const numbered = (n) => searchPage.replace(/44000000(0\d)/g, (_, d) => String(4500000000 + n * 10 + Number(d)))

// A fake LinkedIn that logs every request. `search` and `job` answer by the
// running request count, and may throw the way http.js does.
function fakeLinkedin({ search = () => searchPage, job = () => jobView, landedOn = null } = {}) {
  const calls = []
  const http = async (url, options) => {
    calls.push({ url, accept: options?.headers?.Accept })
    const body = url.includes('/jobPosting/') ? job(calls.length, url) : search(calls.length, url)
    return { url: landedOn ?? url, text: async () => body }
  }
  const searches = () => calls.filter((c) => c.url.includes('/seeMoreJobPostings/'))
  const views = () => calls.filter((c) => c.url.includes('/jobPosting/'))
  return { http, calls, searches, views }
}

const quiet = () => linkedin({ wait: async () => {} })
const described = (rows) => rows.filter((r) => r.description !== '')

describe('linkedin adapter', () => {
  it('asks for html, India and the past month, page 0 of every term first', async () => {
    const li = fakeLinkedin()
    await quiet().fetch(li.http)
    const firstRound = li.searches().slice(0, TERMS.length)
    expect(firstRound.map((c) => decodeURIComponent(c.url.match(/keywords=([^&]+)/)[1]))).toEqual(TERMS)
    for (const c of li.calls) expect(c.accept).toBe('text/html')
    for (const c of li.searches()) {
      expect(c.url).toContain('location=India')
      expect(c.url).toContain('f_TPR=r2592000')
      // Measured to be ignored by the endpoint, so never sent.
      expect(c.url).not.toContain('f_E=')
    }
    expect(firstRound.every((c) => c.url.endsWith('start=0'))).toBe(true)
  })

  // Every term gets the same three cards here. The first term keeps them;
  // every other term's first page, and the first term's second, adds nothing
  // new and ends that term.
  it('keeps each posting once however many terms find it, and stops a term with nothing new', async () => {
    const li = fakeLinkedin()
    const adapter = quiet()
    const rows = await adapter.fetch(li.http)
    expect(rows.map((r) => r.externalId)).toEqual(['4400000001', '4400000002', '4400000003'])
    expect(li.searches()).toHaveLength(TERMS.length + 1)
    expect(li.views()).toHaveLength(3)
    expect(adapter.note).toBeNull()
  })

  it('fills in the description and level from the posting, and keeps the LinkedIn link', async () => {
    const [row] = await quiet().fetch(fakeLinkedin().http)
    expect(row.description).toContain('- Build and ship features in React and Node.js')
    expect(row.description).not.toMatch(/<|Show more/)
    expect(row.level).toBe('internship')
    expect(row.url).toBe('https://in.linkedin.com/jobs/view/software-engineer-intern-at-northwind-labs-4400000001')
  })

  it('stays within 60 search requests and 40 descriptions', async () => {
    const li = fakeLinkedin({ search: numbered })
    const rows = await quiet().fetch(li.http)
    expect(li.searches()).toHaveLength(SEARCH_BUDGET)
    expect(li.views()).toHaveLength(DESCRIBE_CAP)
    expect(rows).toHaveLength(SEARCH_BUDGET * 3)
    expect(described(rows)).toHaveLength(DESCRIBE_CAP)
    // 14 terms 4 deep is 56; the last 4 requests are the first 4 terms' fifth page.
    expect(li.searches().filter((c) => c.url.endsWith('start=40'))).toHaveLength(4)
    expect(li.searches().some((c) => c.url.endsWith('start=50'))).toBe(false)
  })

  it('pauses 1.5 to 2.5 seconds between every two requests', async () => {
    const waits = []
    const li = fakeLinkedin()
    await linkedin({ wait: async (ms) => { waits.push(ms) } }).fetch(li.http)
    expect(waits).toHaveLength(li.calls.length - 1)
    for (const ms of waits) {
      expect(ms).toBeGreaterThanOrEqual(1500)
      expect(ms).toBeLessThan(2500)
    }
  })
})

describe('linkedin adapter on a refusal', () => {
  it('stops the whole run at the first 429 and returns what came in', async () => {
    const li = fakeLinkedin({
      search: (n) => {
        if (n === 5) throw new Error('HTTP 429 for https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search')
        return numbered(n)
      },
    })
    const adapter = quiet()
    const rows = await adapter.fetch(li.http)
    expect(li.calls).toHaveLength(5)
    expect(li.views()).toHaveLength(0)
    expect(rows).toHaveLength(12)
    expect(adapter.note).toMatch(/refused \(HTTP 429\).*12 postings/)
  })

  it('stops on 999 while fetching descriptions too', async () => {
    const li = fakeLinkedin({
      search: numbered,
      job: (n) => {
        if (n === SEARCH_BUDGET + 3) throw new Error('HTTP 999 for https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/1')
        return jobView
      },
    })
    const adapter = quiet()
    const rows = await adapter.fetch(li.http)
    expect(li.views()).toHaveLength(3)
    expect(rows).toHaveLength(SEARCH_BUDGET * 3)
    expect(described(rows)).toHaveLength(2)
    expect(adapter.note).toMatch(/HTTP 999/)
  })

  // The runner retries a source that threw; that retry must not reach LinkedIn.
  it('fails the source when refused before anything came in, and never asks again', async () => {
    const li = fakeLinkedin({ search: () => { throw new Error('HTTP 429 for https://x') } })
    const adapter = quiet()
    await expect(adapter.fetch(li.http)).rejects.toThrow(/refused \(HTTP 429\)/)
    await expect(adapter.fetch(li.http)).rejects.toThrow(/refused \(HTTP 429\)/)
    expect(li.calls).toHaveLength(1)
  })

  it('treats a redirect to a sign-in page as a refusal', async () => {
    const li = fakeLinkedin({ landedOn: 'https://www.linkedin.com/authwall?trk=guest' })
    await expect(quiet().fetch(li.http)).rejects.toThrow(/sign in/)
    expect(li.calls).toHaveLength(1)
  })

  it('treats any other failure as one lost page or one lost description', async () => {
    const li = fakeLinkedin({
      search: (n, url) => {
        if (url.endsWith('start=10')) throw new Error('HTTP 400 for https://x')
        return numbered(n)
      },
      job: (n) => {
        if (n === SEARCH_BUDGET + 1) throw new Error('HTTP 404 for https://x')
        return jobView
      },
    })
    const adapter = quiet()
    const rows = await adapter.fetch(li.http)
    // A failed page still spends its request: 60 sent, 14 of them lost.
    expect(li.searches()).toHaveLength(SEARCH_BUDGET)
    expect(rows).toHaveLength((SEARCH_BUDGET - TERMS.length) * 3)
    expect(rows[0].description).toBe('')
    expect(described(rows)).toHaveLength(DESCRIBE_CAP - 1)
    expect(adapter.note).toBeNull()
  })
})

describe('linkedin adapter with the scraper\'s predicates', () => {
  it('skips the description of a posting the store already has', async () => {
    const known = vi.fn(async (source, id) => id === '4400000001')
    const li = fakeLinkedin()
    const rows = await quiet().fetch(li.http, { known })
    expect(known).toHaveBeenCalledWith('linkedin', '4400000001')
    expect(li.views().map((c) => c.url.split('/').pop())).toEqual(['4400000002', '4400000003'])
    expect(rows[0].description).toBe('')
  })

  it('skips the description of a card the scraper would drop', async () => {
    const wanted = vi.fn((source, card) => !/marketing/i.test(card.title))
    const li = fakeLinkedin()
    await quiet().fetch(li.http, { wanted })
    expect(wanted).toHaveBeenCalledWith('linkedin', expect.objectContaining({ externalId: '4400000003' }))
    expect(li.views().map((c) => c.url.split('/').pop())).toEqual(['4400000001', '4400000002'])
  })

  // Skipped cards cost nothing, so the cap goes to the ones that need a body.
  it('spends the cap only on postings it does fetch', async () => {
    const li = fakeLinkedin({ search: numbered })
    const known = (source, id) => Number(id) < 4500000200
    const rows = await quiet().fetch(li.http, { known })
    expect(li.views()).toHaveLength(DESCRIBE_CAP)
    expect(li.views().every((c) => Number(c.url.split('/').pop()) >= 4500000200)).toBe(true)
    expect(described(rows)).toHaveLength(DESCRIBE_CAP)
  })

  it('counts a card as wanted and not yet known when a predicate throws', async () => {
    const boom = () => { throw new Error('store unreadable') }
    const li = fakeLinkedin()
    await quiet().fetch(li.http, { known: boom, wanted: boom })
    expect(li.views()).toHaveLength(3)
  })
})
