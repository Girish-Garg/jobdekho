import { internLevel, jobType as jobTypeOf } from '../providers/employment-type.js'
import { SLICES, readSlice, seniorityOf } from './instahyre-slices.js'

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
// it. Which slices are read, and how far, is in instahyre-slices.js.
export function toRaw(j, jobType = 'full_time', seniority = null) {
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
    ...jobTypeOf(jobType),
    // Instahyre's own filing of the experience it asks (instahyre-slices.js),
    // which core's level rules believe over a title.
    ...(seniority ? { seniority } : {}),
  }
}

// A job comes back once however many slices and groups list it, with
// every slice it was in, which is what says how Instahyre files it.
export function instahyre() {
  return {
    name: 'instahyre',
    async fetch(http) {
      const jobs = new Map()
      let whole = true
      for (const group of FUNCTION_GROUPS) {
        for (const slice of SLICES) {
          const read = await readSlice(http, group, slice)
          if (slice.whole && !read.whole) whole = false
          for (const j of read.objects) {
            const job = jobs.get(j.id) ?? { j, jobType: slice.jobType, keys: new Set() }
            job.keys.add(slice.key)
            jobs.set(j.id, job)
          }
        }
      }
      return [...jobs.values()].map(({ j, jobType, keys }) => toRaw(j, jobType, seniorityOf(keys, whole)))
    },
  }
}
