import { parseHiring } from './hn-parse.js'

// Hacker News' monthly "Ask HN: Who is hiring?" thread, read through HN
// Search (hn.algolia.com), the search HN itself links to, so no HN page is
// fetched. The thread is started by the "whoishiring" account on the first
// weekday of each month and gathers a few hundred posts; about 15 a month are
// for someone in India (hn-place.js). A post never closes, so this source is
// not `complete`, and its link out is to the company, never back to HN.
const SEARCH = 'https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=6'
const item = (id) => `https://hn.algolia.com/api/v1/items/${id}`
const TITLE = /^Ask HN: Who is hiring\?/i
const DAY_MS = 24 * 60 * 60 * 1000

// The threads from the last 35 days, at most two: early in a month last
// month's posts are still the fresh ones, and a posting's own date keeps it
// no longer than any other (core's freshness.js).
const WINDOW_DAYS = 35

export function recentThreads(hits, nowMs) {
  return (hits || [])
    .filter((hit) => TITLE.test(hit?.title || '') && nowMs - Date.parse(hit.created_at) <= WINDOW_DAYS * DAY_MS)
    .slice(0, 2)
    .map((hit) => hit.objectID)
}

export function hnHiring({ now = Date.now } = {}) {
  return {
    name: 'hn-hiring',
    async fetch(http) {
      const found = await (await http(SEARCH)).json()
      const out = []
      for (const id of recentThreads(found?.hits, now())) {
        try {
          const thread = await (await http(item(id))).json()
          for (const post of thread?.children || []) {
            const posting = parseHiring(post)
            if (posting) out.push(posting)
          }
        } catch {
          // one thread failing keeps the other
        }
      }
      return out
    },
  }
}
