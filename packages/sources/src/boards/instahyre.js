import { internLevel } from '../providers/employment-type.js'

// The JSON behind Instahyre's logged-out search page: no session, no key.
// docs/adding-sources.md once ruled the site out as login-walled; applying is,
// the listing search is not.
//
// Free text is ignored (q, keywords and location all return the unfiltered
// board), so the sweep is by job function id from /api/v1/job_function/. The
// server answers 400 to more than three function ids in one request, which is
// why each family arrives as a triple rather than one list.
const FUNCTION_GROUPS = [
  [10, 1, 3], // backend, full-stack, frontend: the software and web families
  [9, 17, 39], // data science / ML, data engineering, data analysis / BI
  [8, 5, 60], // devops / cloud, QA / SDET, mobile
]

// The payload carries no employment type, so job_type on the query is the
// platform's own word for it, spelled the way its meta.job_type_counts spells
// it. Internships (about 60 board-wide) and entry level roles (about 500) are
// slices small enough that one page holds the tech share of each. The general
// slice samples a 13,000 row board with no date to sort by, so two pages is
// where it stops. 3 groups x (1 + 1 + 2) pages is 12 requests per run.
const SLICES = [
  { jobType: 'internship', filter: 'job_type=2', pages: 1 },
  { jobType: 'full_time', filter: 'job_type=1&experience_level=entry_level', pages: 1 },
  { jobType: 'full_time', filter: 'job_type=1', pages: 2 },
]
// Asking for more still returns 35, so paging assumes exactly that.
const LIMIT = 35

const url = (group, filter, page) =>
  `https://www.instahyre.com/api/v1/job_search?${filter}` +
  group.map((id) => `&job_functions=${id}`).join('') +
  `&limit=${LIMIT}&offset=${page * LIMIT}`

export function toRaw(j, jobType = 'full_time') {
  const keywords = Array.isArray(j.keywords) ? j.keywords : []
  return {
    externalId: String(j.id),
    title: j.title || '',
    // Nested under employer, not company, and named company_name.
    company: j.employer?.company_name || '',
    // A plain string: "Bangalore,Gurgaon,Hyderabad" or "Work From Home".
    location: j.locations || '',
    url: j.public_url || '',
    // The search payload has no body and no date. Skills go in tags rather than
    // standing in for a body: a skill list read as the description would trip
    // the thin-JD ghost signal on every row, while an empty one is read as a
    // scrape gap, and a missing date is never counted as age.
    description: '',
    tags: keywords,
    postedAt: null,
    logoUrl: j.employer?.profile_image_src || null,
    ...internLevel(jobType),
  }
}

export function instahyre() {
  return {
    name: 'instahyre',
    async fetch(http) {
      const out = []
      for (const group of FUNCTION_GROUPS) {
        for (const { jobType, filter, pages } of SLICES) {
          for (let page = 0; page < pages; page++) {
            try {
              const res = await http(url(group, filter, page))
              out.push(...((await res.json()).objects || []).map((j) => toRaw(j, jobType)))
            } catch {
              // One bad page should not lose the pages that did come back.
            }
          }
        }
      }
      return out
    },
  }
}
