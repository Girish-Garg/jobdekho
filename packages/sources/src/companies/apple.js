import { toIso } from '../iso-date.js'
import { politeAdapter, readPages, pauseFor } from './portal-polite.js'
import { describeNew } from './portal-describe.js'
import { sections, inIndia } from './portal-text.js'
import { parseSearch, parseDetail } from './apple-page.js'

// jobs.apple.com's search, narrowed with the site's own location filter
// (india-INDC) and its newest-first sort, 20 to a page. On 2026-09-30 it held
// 169 India postings; five pages are the 100 newest. The site has no
// robots.txt (it redirects to a 404 page). The pages are rendered on the
// server with their data embedded (apple-page.js), so they are read as the
// browser receives them; the list gives a summary, a posting's own page the
// rest.
const BASE = 'https://jobs.apple.com/en-in'
const PAGE_SIZE = 20
const MAX_PAGES = 5
const searchUrl = (page) => `${BASE}/search?location=india-INDC&sort=newest&page=${page + 1}`

// A standing retail role's id carries a "PIPE-" prefix the site's own links
// leave off (/details/200313970/in-business-expert?team=APPST).
const idOf = (r) => String(r?.id || '').replace(/^PIPE-/, '')
const detailUrl = (r) =>
  `${BASE}/details/${idOf(r)}/${r.transformedPostingTitle || ''}${r.team?.teamCode ? `?team=${r.team.teamCode}` : ''}`

// { name: "Hyderabad", countryName: "India" }, or the country alone.
const place = (l) => (!l?.name || l.name === l.countryName ? l?.countryName : `${l.name}, ${l.countryName}`)
const where = (r) => inIndia((r.locations || []).map(place).filter(Boolean).join(' / '))

const asHtml = { headers: { Accept: 'text/html' } }
const get = async (http, url) => (await http(url, asHtml)).text()

const listed = (r) => ({ externalId: idOf(r), title: r.postingTitle || '', company: 'Apple', location: where(r) })

// The requirements are separate fields, and they are where the degree and
// years of experience are stated.
const toPosting = (r, d) => ({
  ...listed(r),
  url: detailUrl(r),
  description: sections([
    ['', d.jobSummary || r.jobSummary],
    ['Description', d.description],
    ['Responsibilities', d.responsibilities],
    ['Minimum qualifications', d.minimumQualifications],
    ['Preferred qualifications', d.preferredQualifications],
  ]),
  tags: [r.team?.teamName].filter(Boolean),
  postedAt: toIso(d.postDateInGMT || r.postDateInGMT),
})

export function apple({ pause = pauseFor(1000) } = {}) {
  return politeAdapter('apple', async (http, context, adapter) => {
    const pages = await readPages(async (page) => parseSearch(await get(http, searchUrl(page))), {
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      pause,
    })
    return describeNew(pages, {
      name: 'apple',
      adapter,
      context,
      pause,
      idOf,
      asListed: listed,
      read: async (r) => parseDetail(await get(http, detailUrl(r))),
      toPosting,
    })
  })
}
