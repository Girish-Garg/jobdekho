import { load } from 'cheerio'
import { stripHtml } from '../html.js'
import { dateFrom } from './avature-dates.js'

// A posting's page is built from fields the tenant chose, in one of two
// templates seen so far: article__content__view__field (EA, Lenovo, Siemens)
// and article__view__item with field-title / field-value (Deloitte). A field
// with a label is a fact ("Posted since", "Location(s)", "Work mode"); one
// without is prose, and the prose together is the description. A field the
// template hides (visibility--hidden) is for recruiters and is skipped.
const FIELD = '.article__content__view__field, .article__view__item'
const LABEL = '.article__content__view__field__label, .field-title'
const VALUE = '.article__content__view__field__value, .field-value'
const flat = (node) => node.text().replace(/\s+/g, ' ').trim()

// Unlabelled blocks that are a place list, not prose: EA's "Locations:
// Hyderabad, Telangana, India", Lenovo's "Additional Locations: * India -
// Bangalore". Left in, the second would open every Lenovo snippet.
const PLACE_LIST = /^(additional )?locations?\s*:/i

// Some portals also publish a schema.org JobPosting for search engines
// (Deloitte does, EA does not). Where there is one, its description is the
// posting alone, without the portal's paragraphs about the company.
function jobPosting($) {
  let found = null
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text())
      if (!found && data?.['@type'] === 'JobPosting') found = data
    } catch {
      // A malformed block is ignored; the page's own fields still answer.
    }
  })
  return found
}

const addressOf = (ld) => {
  const a = ld?.jobLocation?.address
  return [a?.addressLocality, a?.addressRegion, a?.addressCountry].filter((x) => typeof x === 'string' && x.trim()).join(', ')
}

const pick = (facts, re) => [...facts].find(([label, value]) => re.test(label) && value)?.[1] || ''

// Siemens names the place in one "Location(s)" field; Lenovo splits it into
// City, State and Country/Region (a city-state repeats: "Bangkok, Bangkok");
// EA and Deloitte print it unlabelled in a block of its own.
function placeOf($, facts, ld) {
  const named = pick(facts, /^(job )?locations?\b|^location\(s\)/)
  if (named) return named
  const split = [/^city/, /^state/, /^country/].map((re) => pick(facts, re)).filter((v, i, a) => v && v !== a[i - 1])
  if (split.length) return split.join(', ')
  const block = flat($('.field--locations, .article__header--locations').first())
  return block.replace(/^locations?\s*:\s*/i, '') || addressOf(ld)
}

export function parseDetail(html) {
  const $ = load(String(html || ''))
  const facts = new Map()
  const prose = []
  $(FIELD).each((_, el) => {
    const field = $(el)
    if (/(^|\s)visibility--hidden(\s|$)/.test(field.attr('class') || '')) return
    const label = flat(field.find(LABEL).first()).replace(/:$/, '').toLowerCase()
    const value = field.find(VALUE).first()
    const text = flat(value)
    if (label) facts.set(label, text)
    else if (text && !PLACE_LIST.test(text)) prose.push(value.html() || '')
  })
  const ld = jobPosting($)
  return {
    description: stripHtml(ld?.description || prose.join('<br><br>')),
    location: placeOf($, facts, ld),
    postedAt: dateFrom(ld?.datePosted) || dateFrom(pick(facts, /posted|^date\b|posting date/)),
    workMode: pick(facts, /^work ?(mode|model)|^remote/),
  }
}
