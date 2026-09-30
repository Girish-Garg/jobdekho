import { isThrottled } from './portal-polite.js'

// For a portal whose list carries no body (Apple, RippleHire), the
// detail calls are nearly all a run costs, so at most this many are spent per
// company. What a run cannot reach waits for the next one rather than going
// out without a body.
export const MAX_DETAILS = 40

// The runner's context (apps/scraper/src/scrape.js) says cheaply whether the
// store already holds a posting's body and whether the relevance filter would
// keep it at all. A known posting needs no second call, and an unwanted one
// is never stored, so without this check it would be fetched again on every
// run. Without a context every row is a candidate, in list order, to the cap.
// A newest-first list that gains a posting between two page requests shows
// the last row of one page again at the top of the next, so an id is only
// taken once.
function pickNew(rows, { name, context, idOf, asListed }) {
  const known = context?.known
  const wanted = context?.wanted
  const seen = new Set()
  return rows
    .filter((row) => {
      const id = idOf(row)
      if (!id || seen.has(id)) return false
      seen.add(id)
      if (known?.(name, id)) return false
      return !wanted || wanted(name, asListed(row))
    })
    .slice(0, MAX_DETAILS)
}

// One at a time, a pause before each. A failed posting is left out and the
// rest carry on; a 429 ends the reading there and keeps what arrived.
async function readEach(rows, read, pause) {
  const details = new Map()
  for (const row of rows) {
    await pause()
    try {
      const detail = await read(row)
      if (detail) details.set(row, detail)
    } catch (err) {
      if (isThrottled(err)) return { details, throttled: true }
    }
  }
  return { details, throttled: false }
}

// Only postings whose detail arrived are returned, as the Workday provider
// does: these lists carry no date, so a known posting sent again from its
// list row would overwrite the stored date with none. Every read failing is a
// broken source, not an empty one; a refused host is noted, not thrown.
export async function describeNew(listed, spec) {
  const { name, adapter, pause } = spec
  const todo = pickNew(listed.rows, spec)
  const { details, throttled } = await readEach(todo, spec.read, pause)
  if (todo.length && !details.size && !listed.throttled && !throttled) {
    throw new Error(`${name} listed ${todo.length} new postings but no detail could be read`)
  }
  if (listed.throttled || throttled) adapter.note = 'stopped early: the careers site answered 429'
  return todo.filter((row) => details.has(row)).map((row) => spec.toPosting(row, details.get(row)))
}
