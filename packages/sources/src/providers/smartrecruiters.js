import { internLevel } from './employment-type.js'
import { toIso } from '../iso-date.js'
import { descriptionFromSections, fillDescriptions } from './smartrecruiters-detail.js'

// fullLocation is prebuilt by the platform and ships empty segments when a
// posting has no region, e.g. "Chennai, , India".
const clean = (s) => String(s || '').split(',').map((p) => p.trim()).filter(Boolean).join(', ')

function place(l) {
  if (!l) return ''
  const where = clean(l.fullLocation) || clean([l.city, l.region, l.country?.toUpperCase()].join(','))
  if (l.remote) return where ? `Remote - ${where}` : 'Remote'
  return where
}

const PER_PAGE = 100
// Six configured boards each reported exactly 100 postings, which is this
// endpoint's page size, not their size: Bosch alone had 4779. Reading one page
// silently discarded about 6500 postings, more than the whole relevant corpus.
//
// country=in is what makes paging them affordable. These are multinationals,
// so most of that 4779 is not reachable from India anyway and the location
// rule would drop it after the request had already been paid for; the filter
// moves that decision to the server and takes Bosch to 559. The trade is that
// a genuinely worldwide-remote role at one of these companies is now out of
// reach, where before it had a one-in-forty-eight chance of being in the
// single page that was read.
const url = (slug, offset) =>
  `https://api.smartrecruiters.com/v1/companies/${slug}/postings` +
  `?limit=${PER_PAGE}&offset=${offset}&country=in`

// A ceiling on a board nobody expected to be this large, so one company
// cannot dominate a run. No configured board is near it.
const MAX_PAGES = 12

export function smartrecruiters({ slug }) {
  return {
    name: `smartrecruiters:${slug}`,
    async fetch(http) {
      const content = []
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await http(url(slug, page * PER_PAGE))
        const data = await res.json()
        const rows = data.content || []
        content.push(...rows)
        // totalFound is absent on some responses, so the short page is the
        // reliable end marker and the count is only a shortcut.
        if (rows.length < PER_PAGE || content.length >= (data.totalFound ?? 0)) break
      }
      const postings = content.map((j) => ({
        externalId: String(j.id),
        title: j.name || '',
        company: j.company?.name || slug,
        location: place(j.location),
        url: `https://jobs.smartrecruiters.com/${slug}/${j.id}`,
        // the list response never actually carries jobAd, but reading it here
        // costs nothing and picks the body up automatically if that changes
        description: descriptionFromSections(j.jobAd?.sections),
        tags: [j.department?.label, j.function?.label, j.typeOfEmployment?.label].filter(Boolean),
        postedAt: toIso(j.releasedDate),
        ...internLevel(j.typeOfEmployment?.id, j.experienceLevel?.id),
      }))
      // the list endpoint is metadata only, so the body has to come from a
      // second call per posting
      return fillDescriptions(http, slug, postings)
    },
  }
}
