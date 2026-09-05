import { describe, it, expect } from 'vitest'
import { linkedin, parseLinkedin } from '@jobdekho/sources/boards/linkedin.js'

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

describe('linkedin adapter', () => {
  it('sweeps six terms, three pages each, and asks for html', async () => {
    const calls = []
    const http = async (url, options) => {
      calls.push({ url, accept: options?.headers?.Accept })
      return { text: async () => html }
    }
    const rows = await linkedin().fetch(http)
    expect(calls).toHaveLength(18)
    expect(rows).toHaveLength(36)
    for (const c of calls) {
      expect(c.accept).toBe('text/html')
      expect(c.url).toContain('location=India')
      expect(c.url).toContain('f_TPR=r604800')
    }
    expect(calls.filter((c) => c.url.includes('keywords=software%20engineer%20intern'))).toHaveLength(3)
    expect(calls.map((c) => c.url).filter((u) => u.includes('start=20'))).toHaveLength(6)
  })

  it('keeps the pages that worked when one page fails', async () => {
    const http = async (url) => {
      if (url.includes('start=10')) throw new Error('HTTP 400')
      return { text: async () => html }
    }
    expect(await linkedin().fetch(http)).toHaveLength(24)
  })
})
