import { parseLinkedin } from './linkedin-cards.js'
import { jobUrl, parseLinkedinJob } from './linkedin-job.js'
import { planQueries, searchUrl, SEARCH_BUDGET, DESCRIBE_CAP, PAST_MONTH } from './linkedin-plan.js'
import { Refused } from './linkedin-polite.js'

const SOURCE = 'linkedin'

// A refusal ends the run. Anything else cost one page or one posting, and
// the rest still run.
async function attempt(step) {
  try {
    return await step()
  } catch (err) {
    if (err instanceof Refused) throw err
    return null
  }
}

// `cards` belongs to the caller, keyed by posting id, so a refusal part way
// through still leaves it everything that came in first. It is also the
// dedupe: one internship turns up under several terms. `lookback` is the
// f_TPR window, a month or a week (see linkedin-plan.js).
export async function sweep(get, cards, { plan = planQueries(), budget = SEARCH_BUDGET, lookback = PAST_MONTH } = {}) {
  const spent = new Set()
  let used = 0
  for (const { term, page } of plan) {
    if (used >= budget) break
    if (spent.has(term)) continue
    used += 1
    const rows = await attempt(async () => parseLinkedin(await get(searchUrl(term, page, lookback))))
    if (!rows) continue
    const fresh = rows.filter((row) => !cards.has(row.externalId))
    for (const row of fresh) cards.set(row.externalId, row)
    // A page with nothing this run had not already seen, or no cards at all:
    // a term's deeper pages only drift further from it, so what is left of
    // the budget goes to the other terms.
    if (fresh.length === 0) spent.add(term)
  }
  return used
}

// The scraper can see the store and the relevance rules; this package cannot,
// so it asks. A predicate that is missing or throws costs at most a request:
// the card counts as wanted and not yet described.
async function ask(predicate, fallback, ...args) {
  if (!predicate) return fallback
  try {
    return Boolean(await predicate(...args))
  } catch {
    return fallback
  }
}

// In the order the sweep found them, so page 0 of every term comes first.
// wanted(source, card) skips a card the scraper's own filter would drop: 16%
// of sampled cards were, and being dropped they are never stored, so without
// it they would take their share of the cap again on every run.
// known(source, externalId) skips a posting the store already has a body for.
export async function describe(get, cards, { known, wanted, cap = DESCRIBE_CAP } = {}) {
  let used = 0
  for (const card of cards.values()) {
    if (used >= cap) break
    if (!(await ask(wanted, true, SOURCE, card))) continue
    if (await ask(known, false, SOURCE, card.externalId)) continue
    used += 1
    const job = await attempt(async () => parseLinkedinJob(await get(jobUrl(card.externalId))))
    if (job) Object.assign(card, job)
  }
  return used
}
