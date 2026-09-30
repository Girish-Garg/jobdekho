import { load } from 'cheerio'
import { toIso } from '../iso-date.js'

const flat = (node) => node.text().replace(/\s+/g, ' ').trim()

// The card names its posting twice: a data-entity-urn on the card itself and
// the numeric tail of the view link. Either alone is the stable id; the rest
// of the href is a title slug that changes when the title is edited, and a
// query string of per-impression tracking tokens that changes on every request.
const urnId = (card) => (card.attr('data-entity-urn') || '').match(/(\d+)$/)?.[1]
const pathId = (path) => path.match(/-(\d+)$/)?.[1]

// The company's logo, lazily loaded from data-delayed-url. A company with
// none shows LinkedIn's stock ghost image, which is not its logo at all.
const logoOf = (card) => {
  const src = card.find('img[data-delayed-url]').attr('data-delayed-url') || ''
  return src.includes('company-logo') ? src : null
}

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
      // A search card carries no body. linkedin-job.js fills it in from the
      // posting's own guest page, for the postings worth a request; for the
      // rest an empty description is the honest value: the degree classifier
      // finds nothing rather than reading text that was never the employer's.
      description: '',
      tags: [],
      postedAt: toIso(card.find('time[datetime]').attr('datetime')),
      logoUrl: logoOf(card),
    })
  })
  return out
}
