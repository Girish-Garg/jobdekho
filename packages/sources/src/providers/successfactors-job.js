import { load } from 'cheerio'
import { placeName, distinctCities } from './successfactors-place.js'

// A classic job page carries schema.org JobPosting microdata for search
// engines, the same on all six sites sampled (EY, YASH, Asian Paints, Volvo,
// Mahindra, ZF), where the visible fields around it are each site's own
// choice: EY shows a city, YASH a list of places, others a department. So
// the microdata is what is read.
const meta = ($, scope, prop) => $(scope).find(`[itemprop="${prop}"]`).first().attr('content') || ''

// Each address is either structured (locality, region, country code) or,
// for a role's extra places, one free-text line such as "Pune, IN".
function placesOf($, shell) {
  const places = []
  shell.find('[itemprop="address"]').each((_, el) => {
    const parts = ['addressLocality', 'addressRegion', 'addressCountry'].map((p) => meta($, el, p)).filter(Boolean)
    const place = placeName(parts.length ? parts.join(', ') : meta($, el, 'streetAddress'))
    if (place) places.push(place)
  })
  return distinctCities(places)
}

// Null when the page holds no posting: an error page, or a job link that
// redirects to a Unify shell (Wipro's do).
export function parseJob(html) {
  const $ = load(String(html || ''))
  const shell = $('[itemtype$="schema.org/JobPosting"]').first()
  if (!shell.length) return null
  return {
    title: $('[itemprop="title"]').first().text().replace(/\s+/g, ' ').trim(),
    // "Wed Sep 30 02:01:00 UTC 2026", which Date.parse reads as it stands.
    datePosted: meta($, shell, 'datePosted'),
    places: placesOf($, shell),
    // HTML; the posting mapper strips it.
    description: $('[itemprop="description"]').first().html() || '',
  }
}
