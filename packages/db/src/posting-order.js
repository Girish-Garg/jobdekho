import { sql } from 'drizzle-orm'
import { postings } from './schema.js'

export const SORTS = ['newest', 'oldest', 'added', 'company', 'match']

// The ordering is applied to the OUTER select, which reads from the ranked
// subquery, so it has to name that alias rather than the postings table.
// Referencing postings there is a missing-range-table error at runtime.
const orderMap = (t) => ({
  // postedAt is nullable and Postgres sorts NULLs first on DESC, which would
  // put every undated posting at the top of "newest". They belong last.
  newest: sql`${t.postedAt} desc nulls last`,
  oldest: sql`${t.postedAt} asc nulls last`,
  added: sql`${t.firstSeenAt} desc`,
  company: sql`lower(${t.company}) asc`,
})

export function orderFor(sort, t = postings) {
  const map = orderMap(t)
  // Ranking is a computed column on the subquery, so it is ordered by alias.
  // Ties fall back to newest, or a whole score band would come back arbitrary.
  if (sort === 'match') return [sql`match_score desc`, map.newest, sql`${t.id} desc`]
  // A whole scrape shares one firstSeenAt, so every ordering needs a tiebreaker
  // or a LIMIT slices the tie arbitrarily and whole sources vanish from a page.
  return [map[sort] || map.newest, sql`${t.id} desc`]
}

// One role listed in six cities is six real postings, not a duplicate to
// delete. The grid shows the newest of each and says how many there are, so the
// count has to come from the whole matching set rather than from one page.
// Falling back to id matters: a row with no groupKey must be its own group, or
// every unkeyed row collapses into a single partition of thousands.
export const groupCountColumn = sql`count(*) over (partition by coalesce(${postings.groupKey}, ${postings.id}))`

// A company board is named "provider:slug" and an aggregator is named by
// itself, so the colon is already the difference between a posting read off
// the employer's own board and the same role reprinted by a middleman. When a
// group holds both, the direct one represents it: its link goes to the
// employer rather than through a redirector, and its description is the full
// ad rather than whatever the aggregator kept. The rest of the group is not
// discarded, only ranked below, and groupCount still says how many there are.
const DIRECT_FIRST = sql`(${postings.source} like '%:%') desc`

export const groupRankColumn = sql`
  row_number() over (
    partition by coalesce(${postings.groupKey}, ${postings.id})
    order by ${DIRECT_FIRST}, ${postings.postedAt} desc nulls last, ${postings.id} desc
  )`

// groupCountColumn cannot carry the ghost blast signal: it counts every row in
// a group, and a group is also how one role listed city by city is stored, so
// an employer hiring in six offices would count identically to a job blasted
// across six boards. Counting DISTINCT sources over the same partition tells
// those apart. Same coalesce(groupKey, id) fallback as above, and for the same
// reason - an unkeyed row must be its own group, not fall into one shared
// partition with every other unkeyed row.
//
// Postgres rejects count(distinct x) over (...) outright with 0A000, "DISTINCT
// is not implemented for window functions", so the count is built out of two
// dense ranks instead: ranking the sources ascending and descending within the
// partition and adding the two gives every row the same total, one more than
// the number of distinct values. Nothing in a fake-db test can catch that
// rejection, since the SQL is only text until Postgres parses it, which is how
// the DISTINCT version reached a running server.
const bySource = (direction) => sql`
  dense_rank() over (
    partition by coalesce(${postings.groupKey}, ${postings.id})
    order by ${postings.source} ${direction}
  )`

export const groupSourceCountColumn = sql`(${bySource(sql`asc`)} + ${bySource(sql`desc`)} - 1)`
