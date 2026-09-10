// Time is compared as canonical ISO strings (see timestamp.js) and every
// ordering ends on the posting id, for the reason given at idDesc.
export const SORTS = ['newest', 'oldest', 'added', 'company', 'match']

const asc = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const desc = (a, b) => asc(b, a)

// postedAt is nullable and Postgres sorted NULLs first on DESC, which put
// every undated posting at the top of "newest". They belong last under either
// direction: a missing date says nothing about age.
const nullsLast = (compare) => (a, b) => {
  if (a == null || b == null) return (a == null) - (b == null)
  return compare(a, b)
}

const by = (pick, compare) => (a, b) => compare(pick(a), pick(b))

const chain = (...compares) => (a, b) => {
  for (const compare of compares) {
    const order = compare(a, b)
    if (order) return order
  }
  return 0
}

const postedDesc = by((row) => row.postedAt, nullsLast(desc))

// A whole scrape shares one firstSeenAt, so every ordering needs a tiebreaker
// or a page slices the tie arbitrarily and whole sources vanish from a page.
const idDesc = by((row) => row.id, desc)

const ORDERS = {
  newest: postedDesc,
  oldest: by((row) => row.postedAt, nullsLast(asc)),
  added: by((row) => row.firstSeenAt, nullsLast(desc)),
  company: by((row) => String(row.company || '').toLowerCase(), asc),
}

export function orderFor(sort) {
  // Ties fall back to newest, or a whole score band would come back arbitrary.
  if (sort === 'match') return chain(by((row) => row.matchScore, desc), postedDesc, idDesc)
  return chain(ORDERS[sort] || ORDERS.newest, idDesc)
}

// A company board is named "provider:slug" and an aggregator is named by
// itself, so the colon is already the difference between a posting read off
// the employer's own board and the same role reprinted by a middleman. When a
// group holds both, the direct one represents it: its link goes to the
// employer rather than through a redirector, and its description is the full
// ad rather than whatever the aggregator kept. The rest of the group is not
// discarded, only ranked below, and groupCount still says how many there are.
const directFirst = by((row) => String(row.source || '').includes(':'), desc)

export const groupOrder = chain(directFirst, postedDesc, idDesc)
