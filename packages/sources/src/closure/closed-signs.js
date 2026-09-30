// What a posting's own link says about the job: 'gone', 'live', 'follow' (a
// redirect worth following) or 'unknown'. Seen on 2026-09-30 for postings
// that no longer exist:
//   Greenhouse: 302 to the board itself, "/acme?error=true"
//   Lever: 404, "The job posting you're looking for might have closed"
//   Workday's job API: 404, "errorCode":"S21"
//   Amazon, Internshala, RemoteOK: 404
//   Arbeitnow: 410, "This job posting has been removed"
//   Apple: 200, "Sorry, this role does not exist or is no longer available."
// A 5xx, a 403, a 429, a timeout prove nothing, so they change nothing.
const GONE = new Set([404, 410])

// Pages that answer 200 for a job that is gone, and the words that say so.
const PAGE_SAYS = [
  [/(^|\.)jobs\.apple\.com$/, /this role does not exist or is no longer available/i],
]

// The part of a job link that names the job: a UUID (Lever, Ashby), else the
// longest run of five or more digits (Greenhouse, Internshala, Workday's
// requisition). A redirect that leaves it behind lands on a listing, a search
// or a home page, not on the job.
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export function jobToken(url) {
  let path
  try {
    path = new URL(url).pathname
  } catch {
    return null
  }
  const uuid = path.match(UUID)?.[0]
  if (uuid) return uuid.toLowerCase()
  const runs = path.match(/\d{5,}/g) || []
  return runs.sort((a, b) => b.length - a.length)[0] ?? null
}

export function dropsJob(target, location) {
  const token = jobToken(target)
  if (!token) return false
  let next
  try {
    next = new URL(location, target)
  } catch {
    return false
  }
  return !`${next.pathname}${next.search}`.toLowerCase().includes(token)
}

export function verdict({ target, status, location = null, body = '' }) {
  if (GONE.has(status)) return 'gone'
  if (status >= 300 && status < 400) {
    if (!location) return 'unknown'
    return dropsJob(target, location) ? 'gone' : 'follow'
  }
  if (status !== 200) return 'unknown'
  const host = new URL(target).hostname
  const says = PAGE_SAYS.find(([hostRe]) => hostRe.test(host))
  return says && says[1].test(body) ? 'gone' : 'live'
}
