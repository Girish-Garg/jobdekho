import { stripHtml } from '../html.js'
import { toIso } from '../iso-date.js'

// loc_query=India reads like a filter but the search ignores it: on
// 2026-09-30 it answered 10000 jobs worldwide, 8 of the first 100 in India.
// normalized_country_code[] is the filter the site's own country checkbox
// sends, and it answered 2345, every one of them in India.
const PER_PAGE = 100
const url = (offset) =>
  'https://www.amazon.jobs/en/search.json?normalized_country_code%5B%5D=IND' +
  `&result_limit=${PER_PAGE}&offset=${offset}&sort=recent`

// Newest first, so five pages is the last week or two of Indian postings,
// about 3.5 MB a run. Reading all 2345 every run would be seven times that
// for postings an earlier run has already stored.
const MAX_PAGES = 5
const PAUSE_MS = 500
const wait = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS))

// The requirements are separate fields, not part of the description, and
// they are where the degree and years of experience are stated.
function body(j) {
  return [
    ['', j.description],
    ['Basic qualifications', j.basic_qualifications],
    ['Preferred qualifications', j.preferred_qualifications],
  ]
    .map(([title, html]) => ({ title, text: stripHtml(html || '') }))
    .filter(({ text }) => text)
    .map(({ title, text }) => [title, text].filter(Boolean).join('\n\n'))
    .join('\n\n')
}

// "Bengaluru, Karnataka, IND": core's location rule reads "India", not the
// ISO code, and would drop a city it has no name for.
const place = (j) => String(j.normalized_location || j.location || '').replace(/\bIND$/, 'India')

// posted_date is "September 30, 2026", which Date.parse reads as local
// midnight; pinned to UTC so a date does not shift with the machine's zone.
const posted = (d) => (d ? toIso(`${d} UTC`) : null)

function toPosting(j) {
  return {
    externalId: String(j.id_icims || ''),
    title: j.title || '',
    company: 'Amazon',
    location: place(j),
    url: j.job_path ? `https://www.amazon.jobs${j.job_path}` : '',
    description: body(j),
    tags: [j.job_category].filter(Boolean),
    postedAt: posted(j.posted_date),
  }
}

export function amazon({ pause = wait } = {}) {
  return {
    name: 'amazon',
    async fetch(http) {
      const jobs = []
      for (let page = 0; page < MAX_PAGES; page++) {
        if (page) await pause()
        let rows
        try {
          rows = (await (await http(url(page * PER_PAGE))).json()).jobs || []
        } catch (err) {
          // the first page failing is the source failing; a later one is
          // skipped so the pages already read still count
          if (page === 0) throw err
          continue
        }
        jobs.push(...rows)
        if (rows.length < PER_PAGE) break
      }
      return jobs.map(toPosting)
    },
  }
}
