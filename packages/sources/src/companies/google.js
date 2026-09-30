import { toIso } from '../iso-date.js'
import { politeAdapter } from './portal-polite.js'
import { sections, inIndia } from './portal-text.js'
import { jobsFromPage } from './google-page.js'

// The old careers.google.com/api/v3/search/ answers 404. Today's results page
// renders on the server and embeds every job it shows whole, body included
// (google-page.js), narrowed with the site's own location filter and sorted
// newest first. google.com/robots.txt disallows the paged results URLs
// (results?*&page=) for every agent, so only the first page is read: the 20
// India postings most recently published, about 1.3 MB. On 2026-09-30 those
// 20 spanned the last 20 hours, so a daily run keeps up.
//
// The site's feed.xml was not used: 20 MB for 3450 jobs worldwide, 270 of
// them in India, with no way to ask for India alone.
const RESULTS = 'https://www.google.com/about/careers/applications/jobs/results?location=India&sort_by=date'
const JOB_BASE = 'https://www.google.com/about/careers/applications/jobs/results/'

// Positions in a job's array as the page carried them on 2026-09-30. [13] is
// the time published, the same instant Google's own feed.xml calls
// <published>; [12] is when the posting was created, often weeks earlier.
const F = { id: 0, title: 1, duties: 3, quals: 4, company: 7, places: 9, about: 10, published: 13, created: 12 }

const html = (field) => (Array.isArray(field) ? field[1] : '')

// The site's own links are the id and the title as a slug
// ("137613704471421638-measurement-effectiveness-specialist-measurement").
const slug = (title) => String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// [name, [address], city, postcode, state, country code]; the name is
// already "Bengaluru, Karnataka, India".
const where = (places) => (places || []).map((p) => p?.[0]).filter(Boolean).join(' / ')

const seconds = (stamp) => (Array.isArray(stamp) && stamp[0] ? toIso(stamp[0] * 1000) : null)

function toPosting(j) {
  const id = String(j[F.id])
  const title = j[F.title] || ''
  return {
    externalId: id,
    title,
    company: j[F.company] || 'Google',
    location: inIndia(where(j[F.places])),
    url: `${JOB_BASE}${id}-${slug(title)}`,
    description: sections([
      ['', html(j[F.about])],
      ['', html(j[F.quals])],
      ['Responsibilities', html(j[F.duties])],
    ]),
    tags: [],
    postedAt: seconds(j[F.published]) || seconds(j[F.created]),
  }
}

export function google() {
  return politeAdapter('google', async (http) => {
    const page = await (await http(RESULTS, { headers: { Accept: 'text/html' } })).text()
    return jobsFromPage(page).map(toPosting)
  })
}
