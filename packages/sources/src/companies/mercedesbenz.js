import { toIso } from '../iso-date.js'
import { politeAdapter, pauseFor } from './portal-polite.js'
import { describeNew } from './portal-describe.js'
import { sections } from './portal-text.js'
import { searchUrl, parseSearch } from './mercedesbenz-list.js'
import { englishPage, jobPostingIn } from './mercedesbenz-page.js'

// The Mercedes-Benz Group's job board, narrowed to India with the board's own
// country filter (mercedesbenz-list.js). On 2026-10-04 that was 74
// requisitions, 71 of them at Mercedes-Benz Research and Development India
// (MBRDI) in Bengaluru and Pune, the rest at its financial services arm.
// The list carries no body, so an ad's own page is read for each new
// posting the filter would keep, at most 40 a run (portal-describe.js), one
// a second. The list is the whole of India, so a posting it stops listing
// can be closed (`complete`).
const NAME = 'mercedesbenz'
const asHtml = { headers: { Accept: 'text/html' } }

// The hiring entity is kept as a tag, without its legal tail; the company is
// the board's, as Siemens' is for all of Siemens.
const entity = (name) => String(name || '').replace(/\s+(?:Private|Pvt\.?)\s+(?:Limited|Ltd\.?)$/i, '').trim()

// The board writes Bengaluru both ways, sometimes both on one ad.
const cityKey = (city) => city.toLowerCase().replace('bangalore', 'bengaluru')
function where(ad) {
  const seen = new Set()
  const cities = (ad.PositionLocation || []).map((place) => String(place?.CityName || '').trim()).filter((city) => {
    if (!city || seen.has(cityKey(city))) return false
    seen.add(cityKey(city))
    return true
  })
  return cities.length ? cities.map((city) => `${city}, India`).join(' / ') : 'India'
}

const idOf = (ad) => String(ad?.PositionID || '').trim()

const listed = (ad) => ({ externalId: idOf(ad), title: ad.PositionTitle || '', company: 'Mercedes-Benz', location: where(ad) })

const toPosting = (ad, ld) => ({
  ...listed(ad),
  title: ad.PositionTitle || ld.title || '',
  url: englishPage(ad.PositionURI),
  description: sections([['', ld.description]]),
  tags: [entity(ad.ParentOrganizationName), ...(ad.JobCategory || []).map((category) => category?.Name)].filter(Boolean),
  postedAt: toIso(ld.datePosted) || toIso(ad.PublicationStartDate),
})

// An ad whose link is not on the board's own host has no page to read.
async function readAd(http, ad) {
  const page = englishPage(ad.PositionURI)
  return page ? jobPostingIn(await (await http(page, asHtml)).text()) : null
}

export function mercedesbenz({ pause = pauseFor(1000) } = {}) {
  return politeAdapter(NAME, async (http, context, adapter) => {
    adapter.complete = false
    const found = parseSearch(await (await http(searchUrl())).json())
    adapter.complete = found.complete
    return describeNew({ rows: found.rows, throttled: false }, {
      name: NAME,
      adapter,
      context,
      pause,
      idOf,
      asListed: listed,
      read: (ad) => readAd(http, ad),
      toPosting,
    })
  })
}
