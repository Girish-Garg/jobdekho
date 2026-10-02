import { compactKey } from '@jobdekho/core/company-key.js'
import { listBlockedCompanies } from '@jobdekho/store/blocked-companies.js'

// The companies the person blocked (see the store's blocked-companies.js),
// as one run needs them. `isBlocked(posting)`: whether a posting is one of
// theirs, which the pipeline drops before the write so it never re-enters the
// corpus, the run context calls unwanted so no detail page is fetched for it,
// and the link check passes over. `stopped`: the keys whose own careers page
// is not read at all (see careers-source.js). Postings already stored stay
// where they are, hidden by the feed, until they age out.
//
// Read here rather than by the server, because `npm run scrape` has no server
// to ask and must honour a block too, the way linkedin-setting.js is read. A
// run with no user to ask about blocks nothing.
export function readBlocked(db, userId) {
  const entries = userId ? listBlockedCompanies(db, userId) : []
  const keys = new Set(entries.map((entry) => entry.key))
  return {
    isBlocked: (posting) => keys.size > 0 && keys.has(compactKey(posting?.company)),
    stopped: new Set(entries.filter((entry) => entry.stopFetching).map((entry) => entry.key)),
  }
}
