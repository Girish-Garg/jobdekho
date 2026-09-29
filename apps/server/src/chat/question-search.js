import { isFresh, STALE_AFTER_DAYS } from '@jobdekho/store/posting-filters.js'
import { toIso } from '@jobdekho/store/timestamp.js'
import { companiesNamed, companyKey } from './company-key.js'
import { compactPosting } from './postings-summary.js'

// Enough of one employer's openings to answer "are they hiring backend
// engineers?", ranked by fit so the likeliest ones are the ones shown.
const PER_COMPANY = 15
const DAY_MS = 24 * 60 * 60 * 1000

// The feed a question arrives with is whatever the filters show, 25 rows of
// it, so "is Razorpay hiring?" was answered from a screen with no Razorpay on
// it and went to the web, while JobDekho held ten Razorpay postings. A company
// the question names is looked up across the whole corpus instead, whatever
// the filters say.
//
// Stale rows are asked for too. The feed hides a posting its board has not
// listed for three weeks, since it has most likely closed, and asking without
// them turned "ten Razorpay postings, last seen in August" into "no Razorpay
// postings", which is false. They come after the fresh ones, marked with the
// day they were last seen, and counted apart.
export async function postingsForNamedCompanies(dashboard, userId, question, profile, now = Date.now()) {
  const named = companiesNamed(question, await dashboard.listCompanies())
  const cutoff = toIso(now - STALE_AFTER_DAYS * DAY_MS)
  return Promise.all(named.map(async ({ key, name }) => {
    const rows = await dashboard.listPostingsForUser(userId, { q: key, sort: 'match', profile, includeStale: true, limit: 1000 })
    const theirs = rows.filter((row) => companyKey(row.company) === key)
    const fresh = theirs.filter((row) => isFresh(row, cutoff))
    const stale = theirs.filter((row) => !isFresh(row, cutoff))
    const postings = [
      ...fresh.map(compactPosting),
      ...stale.map((row) => ({ ...compactPosting(row), notSeenSince: String(row.lastSeenAt).slice(0, 10) })),
    ].slice(0, PER_COMPANY)
    return { company: name, openCount: fresh.length, notSeenRecently: stale.length, postings }
  }))
}
