import { politeGet, Refused } from './linkedin-polite.js'
import { sweep, describe } from './linkedin-sweep.js'

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
// linkedin-sweep.js describes. Without them every card is a candidate for a
// description, up to the cap.
export function linkedin({ wait, random } = {}) {
  let refused = null
  const adapter = {
    name: 'linkedin',
    // Why the last run stopped short, or null. A refused run that did collect
    // postings returns them rather than throwing, since the runner keeps
    // nothing from a source that threw, so the reason has to travel here.
    note: null,
    async fetch(http, context) {
      // The runner retries a source that threw. After a refusal that retry
      // must not reach LinkedIn at all.
      if (refused) throw new Error(refused)
      adapter.note = null
      const get = politeGet(http, { wait, random })
      const cards = new Map()
      try {
        await sweep(get, cards)
        await describe(get, cards, { known: context?.known, wanted: context?.wanted })
      } catch (err) {
        if (!(err instanceof Refused)) throw err
        refused = `LinkedIn refused (${err.message}); stopped at once with ${cards.size} postings and will not ask again this run`
        adapter.note = refused
        if (cards.size === 0) throw new Error(refused)
      }
      return [...cards.values()]
    },
  }
  return adapter
}
