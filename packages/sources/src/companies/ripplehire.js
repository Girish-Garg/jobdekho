import { toIso } from '../iso-date.js'
import { politeAdapter, pauseFor } from './portal-polite.js'
import { describeNew } from './portal-describe.js'
import { sections, inIndia } from './portal-text.js'
import { listJobs } from './ripplehire-list.js'

// RippleHire gives each company a candidate site at {tenant}.ripplehire.com,
// named by a token. The token is in the public link on the company's own
// careers page (or in where that link redirects), the same for every
// visitor: it names the career site, it is not a session. The list carries
// no body and no date, so a posting's detail is read for each new one the
// filter would keep, at most 40 a run (portal-describe.js).
//
// site: { name, company, host, token, geo?, keep? }. geo is the site's own
// country filter where it has one; keep(row) narrows where it has none.
const JSON_ = { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } }

const detailUrl = (site, seq) =>
  `https://${site.host}/candidate/candidatejobdetail?token=${site.token}&jobSeq=${seq}&source=CAREERSITE&lang=en`
const jobPage = (site, seq) =>
  `https://${site.host}/candidate/?token=${site.token}&lang=en&source=CAREERSITE#detail/job/${seq}`

// "Select Location" is the picker's placeholder, left where a city belongs.
const city = (s) => {
  const text = String(s || '').trim()
  return /^select\b/i.test(text) ? '' : text
}

// publishDetails.CAREER_SITE is when the posting went up on this site, to
// the second. jobPostingDate ("29-Sep-2026") is the day alone, read as UTC.
const day = (d) => (d ? toIso(`${String(d).replace(/-/g, ' ')} UTC`) : null)
const posted = (vo) => toIso(vo?.publishDetails?.CAREER_SITE) || day(vo?.jobPostingDate)

export function ripplehire(site, { pause = pauseFor(1000) } = {}) {
  const listed = (row) => ({
    externalId: String(row.jobSeq),
    title: row.jobTitle || '',
    company: site.company,
    location: inIndia(city(row.locations)),
  })
  const toPosting = (row, vo) => ({
    ...listed(row),
    title: vo.jobTitle || row.jobTitle || '',
    location: inIndia(city(vo.locations) || city(row.locations)),
    url: jobPage(site, row.jobSeq),
    description: sections([['', vo.jobDesc], ['Skills', vo.jobSkills]]),
    tags: [],
    postedAt: posted(vo),
    experience: vo.jobReqExp || row.jobReqExp || null,
  })
  return politeAdapter(site.name, async (http, context, adapter) => {
    const pages = await listJobs(http, site, pause)
    const rows = site.keep ? pages.rows.filter(site.keep) : pages.rows
    // A list read to its end is every job the site has, so a posting it
    // stops listing has closed (the scraper's closure-turn.js). An empty
    // one is never taken for that: an outage could answer it too.
    adapter.complete = pages.complete && rows.length > 0
    return describeNew({ ...pages, rows }, {
      name: site.name,
      adapter,
      context,
      pause,
      idOf: (row) => (row?.jobSeq ? String(row.jobSeq) : ''),
      asListed: listed,
      read: async (row) => (await (await http(detailUrl(site, row.jobSeq), JSON_)).json())?.jobVO || null,
      toPosting,
    })
  })
}
