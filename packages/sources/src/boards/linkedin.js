import { load } from 'cheerio'
import { toIso } from '../iso-date.js'

// This is the endpoint LinkedIn's own logged-out jobs page calls to load more
// cards: no session, no cookie, no token, and no bot check to get past. It
// reads exactly what a visitor without an account is shown, which is what
// keeps it on the right side of docs/adding-sources.md.
//
// One term per engineering family that packages/core/src/families.js knows
// how to expand (software, web, mobile, data, devops), plus an explicit
// intern query: internships never reach the first pages of a general search,
// and they are the roles this project exists to find.
const TERMS = [
  'software engineer', 'full stack developer', 'android developer',
  'data scientist', 'devops engineer', 'software engineer intern',
]

// A page is 10 cards. Three pages per term is 30 cards and 18 requests to one
// host per run, about what internshala.js spends. Restricting to the past week
// is what makes those pages worth reading on a daily cron: the default ranking
// put postings from two months back on page one, and re-reading the same
// evergreen cards every day would add nothing after the first run.
const PAGES = 3
const PER_PAGE = 10
const PAST_WEEK = 'r604800'
const url = (term, page) =>
  'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search' +
  `?keywords=${encodeURIComponent(term)}&location=India&f_TPR=${PAST_WEEK}&start=${page * PER_PAGE}`

const flat = (node) => node.text().replace(/\s+/g, ' ').trim()

// The card names its posting twice: a data-entity-urn on the card itself and
// the numeric tail of the view link. Either alone is the stable id; the rest
// of the href is a title slug that changes when the title is edited, and a
// query string of per-impression tracking tokens that changes on every request.
const urnId = (card) => (card.attr('data-entity-urn') || '').match(/(\d+)$/)?.[1]
const pathId = (path) => path.match(/-(\d+)$/)?.[1]

export function parseLinkedin(html) {
  const $ = load(html)
  const out = []
  $('.base-search-card').each((_, el) => {
    const card = $(el)
    const path = (card.find('a.base-card__full-link').attr('href') || '').split('?')[0]
    const id = urnId(card) || pathId(path)
    const title = flat(card.find('.base-search-card__title'))
    if (!id || !title) return
    out.push({
      externalId: id,
      title,
      company: flat(card.find('.base-search-card__subtitle')),
      location: flat(card.find('.job-search-card__location')),
      url: path || `https://www.linkedin.com/jobs/view/${id}`,
      // Search cards carry no body at all, and fetching one page per posting
      // would multiply the run's requests by thirty. An empty description is
      // the honest value: the degree classifier finds nothing rather than
      // reading something that was never the employer's text.
      description: '',
      tags: [],
      postedAt: toIso(card.find('time[datetime]').attr('datetime')),
    })
  })
  return out
}

export function linkedin() {
  return {
    name: 'linkedin',
    async fetch(http) {
      const out = []
      for (const term of TERMS) {
        for (let page = 0; page < PAGES; page++) {
          try {
            const res = await http(url(term, page), { headers: { Accept: 'text/html' } })
            out.push(...parseLinkedin(await res.text()))
          } catch {
            // One bad page should not lose the pages that did come back.
          }
        }
      }
      return out
    },
  }
}
