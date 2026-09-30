import { politeGet, Refused } from './linkedin-polite.js'
import { sweep, describe } from './linkedin-sweep.js'
import { FIRST_SWEEP } from './linkedin-plan.js'

export { parseLinkedin } from './linkedin-cards.js'

// Both endpoints this adapter calls are the ones LinkedIn's own logged-out
// jobs pages use: the search that loads more cards and the view of one
// posting. No session, no cookie, no token, and no bot check to get past. It
// reads exactly what a visitor without an account is shown, which is what
// keeps it on the right side of docs/adding-sources.md.
//
// A run is a sweep of search pages (linkedin-plan.js says which), then the
// full description for the new postings among them (linkedin-job.js), all
// through one paced requester that stops everything on a refusal
// (linkedin-polite.js).
//
// fetch's second argument is optional: { known, wanted }, the predicates
// linkedin-sweep.js describes, and `linkedin`, the sweep's size as the
// scrape's guard chose it ({ lookback, searches, views }, see
// apps/scraper/src/linkedin-guard.js). Without them every card is a
// candidate for a description, and the run is a first sweep's size.
export function linkedin({ wait, random, now } = {}) {
  let refused = null
  const adapter = {
    name: 'linkedin',
    // Why the last run stopped short, or null. A refused run that did collect
    // postings returns them rather than throwing, since the runner keeps
    // nothing from a source that threw, so the reason has to travel here.
    note: null,
    // How the last run went, for the guard to record: how many requests
    // LinkedIn answered, and its refusal ({ reason, retryAfterMs }) or null.
    outcome: null,
    async fetch(http, context) {
      // The runner retries a source that threw. After a refusal that retry
      // must not reach LinkedIn at all.
      if (refused) throw new Error(adapter.note)
      adapter.note = null
      const size = { ...FIRST_SWEEP, ...context?.linkedin }
      const get = politeGet(http, { wait, random, now })
      const cards = new Map()
      try {
        await sweep(get, cards, { budget: size.searches, lookback: size.lookback })
        await describe(get, cards, { known: context?.known, wanted: context?.wanted, cap: size.views })
      } catch (err) {
        if (!(err instanceof Refused)) throw err
        refused = { reason: err.message, retryAfterMs: err.retryAfterMs }
        adapter.note = `LinkedIn refused (${err.message}); stopped at once with ${cards.size} postings and will not ask again this run`
        if (cards.size === 0) throw new Error(adapter.note)
      } finally {
        adapter.outcome = { answered: get.answered(), refusal: refused }
      }
      return [...cards.values()]
    },
  }
  return adapter
}
