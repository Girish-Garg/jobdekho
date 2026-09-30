import { toIso } from '../iso-date.js'
import { stripHtml } from '../html.js'
import { politeAdapter, readPages, pauseFor } from './portal-polite.js'
import { sections, inIndia } from './portal-text.js'

// Zwayam runs the careers sites of several Indian employers (careers.coforge.com,
// careers.cyient.com): an Angular app whose search is one public POST to
// public.zwayam.com with the site's domain and company id, as the app's own
// environment carries them (the id base64, "MTUxNzM="). No login or token.
// filterCri is the app's own search object with its Country facet set to
// India, the way its filter panel sends a ticked box. Ten to a page, the
// site's paginationHowMuch, in the order the site is configured with rather
// than by date, so every page is read up to 12: on 2026-09-30 that covered
// all of both, 67 and 111 postings. Each carries its body, so one request a
// page is the whole cost.
//
// site: { name, company, domain, companyId, base } where base is the app's
// address, which a posting's own page hangs off (base + "jobview/" + jobUrl).
const SEARCH = 'https://public.zwayam.com/jobs/search'
const PAGE_SIZE = 10
const MAX_PAGES = 12

const filterCri = (offset) =>
  JSON.stringify({
    paginationStartNo: offset,
    selectedCall: 'sort',
    sortCriteria: { name: 'modifiedDate', isAscending: false },
    anyOfTheseWords: '',
    facetSelectionString: { Country: ['India'] },
  })

// A reply without the list (an unknown company id, a changed shape) is
// thrown rather than read as an empty board.
async function searchPage(http, site, page) {
  const form = new FormData()
  form.append('filterCri', filterCri(page * PAGE_SIZE))
  form.append('domain', site.domain)
  form.append('companyId', site.companyId)
  const reply = await (await http(SEARCH, { method: 'POST', body: form })).json()
  const rows = reply?.data?.data
  if (!Array.isArray(rows)) throw new Error(`${site.name} search answered without a job list`)
  return rows.map((row) => row?._source).filter(Boolean)
}

// "Hyderabad, Telangāna, India" at Cyient, a bare "Greater Noida" at Coforge,
// several places joined with ";".
const where = (s) => inIndia(String(s.location || '').split(';').map((p) => p.trim()).filter(Boolean).join(' / '))

// Approval is when a requisition opens to applicants; the other two are
// earlier drafts of it. All are epoch milliseconds.
const posted = (s) => toIso(s.requisitionApprovedDate) || toIso(s.jobCreatedDate) || toIso(s.createdDate)

// mediumDescription is the body as HTML but cut off at 300 characters; the
// whole of it is in mediumDescriptionWithoutHtml, flattened to one line.
// Older postings keep theirs, HTML and whole, in shortDescription instead.
// The one with the most text is the body, measured as text because tags make
// a cut-off HTML body look longer than the whole flat one; on a tie the HTML
// wins for its line breaks. Cyient adds a profile of the grade in role.
function longest(...sources) {
  let best = { source: '', length: 0 }
  for (const source of sources) {
    const length = stripHtml(source || '').length
    if (length > best.length) best = { source, length }
  }
  return best.source
}
const body = (s) =>
  sections([['', longest(s.shortDescription, s.mediumDescription, s.mediumDescriptionWithoutHtml)], ['Role', s.role]])

function toPosting(site, s) {
  return {
    externalId: String(s.id),
    title: s.jobTitle || '',
    company: site.company,
    location: where(s),
    url: s.jobUrl ? `${site.base}jobview/${s.jobUrl}` : site.base,
    description: body(s),
    tags: [],
    postedAt: posted(s),
    experience: String(s.yrsOfExperience || '').trim() || null,
  }
}

export function zwayam(site, { pause = pauseFor(1000) } = {}) {
  return politeAdapter(site.name, async (http, context, adapter) => {
    const pages = await readPages((page) => searchPage(http, site, page), {
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      pause,
    })
    if (pages.throttled) adapter.note = 'stopped early: the careers site answered 429'
    // Pages of an order that is not by date can shift between two requests,
    // so a posting seen twice is kept once.
    const byId = new Map(pages.rows.filter((s) => s.id != null).map((s) => [String(s.id), s]))
    return [...byId.values()].map((s) => toPosting(site, s))
  })
}
