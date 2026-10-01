import { postingPredicate, clampPage, toNumber } from './posting-filters.js'
import { orderFor } from './posting-order.js'
import { gradeFor } from '@jobdekho/core/grade.js'
import { withGroupWindows } from './posting-groups.js'
import { scoreRows, canRank } from './posting-score.js'
import { fitContextFor } from './fit-inputs.js'
import { withFit, withGhost } from './posting-fit.js'

export function applyStatusFilter(rows, status) {
  const normalized = rows.map((r) => ({ ...r, status: r.status ?? null }))
  return status === undefined ? normalized : normalized.filter((r) => r.status === status)
}

// Filter, group, score, order, and only then cut a page: every step reads the
// one before it across the whole matching set, never just the page. Status is
// part of the filter because matching it after the cut drops actioned rows
// that sit past the first page; the group count comes from all matching rows
// or one city's listing would undercount its siblings; and the minFit floor
// has to see every score or the page it leaves behind comes up short for no
// reason the user can see. Only group leads are scored: the others are gated
// out regardless of score, so scoring them would be work thrown away. All
// but the order and the page is feedMatches, which the company menu counts
// too (see companies.js).
export function feedMatches(store, userId, opts = {}) {
  const statuses = store.statuses.get(userId) ?? {}
  const statusOf = (id) => statuses[id] ?? null
  // Every order is scored when the profile can rank, not only Best fit: the
  // fit floor and the grade on each card mean the same under Newest, and
  // scoring only for Best fit made the floor silently do nothing under any
  // other order. An empty profile scores every row alike, so Best fit falls
  // back to newest first then.
  const ranks = canRank(opts.profile)
  const matching = store.corpus.rows().filter(postingPredicate(opts, statusOf))
  const windowed = withGroupWindows(matching)
  const leads = opts.group === false ? windowed : windowed.filter((row) => row.groupRank === 1)
  const scored = ranks ? scoreRows(leads, fitContextFor(store, opts.profile), store.corpus.rows()) : leads
  // The floor only means anything against a real score. Unranked, every row
  // "scores" zero, so applying it would empty the feed rather than filter it.
  const minFit = ranks ? toNumber(opts.minFit) : null
  return { rows: minFit ? scored.filter((row) => row.matchScore >= minFit) : scored, ranks, statusOf }
}

export async function listPostingsForUser(store, userId, opts = {}) {
  const { limit, offset } = clampPage(opts)
  const { rows: gated, ranks, statusOf } = feedMatches(store, userId, opts)
  const sort = opts.sort === 'match' && !ranks ? 'newest' : opts.sort
  const page = gated.sort(orderFor(sort, { ranked: ranks })).slice(offset, offset + limit)
  const postings = applyStatusFilter(page.map((row) => {
    const seen = { ...row, status: statusOf(row.id) }
    return toPosting(ranks ? withFit(seen) : withGhost(seen))
  }), opts.status)
  return opts.withCounts ? { postings, ...countsOf(gated, ranks) } : postings
}

// The whole matching set's size and how many of it arrived in the last day,
// for the feed's title line. Counting the loaded page instead said "100 new
// today" whenever the first hundred rows happened to be new. Ranked, also how
// many fall in each grade, for the band dividers in the list.
const DAY_MS = 24 * 60 * 60 * 1000

function countsOf(rows, ranked, now = Date.now()) {
  const newToday = rows.filter((row) => now - Date.parse(row.firstSeenAt ?? '') < DAY_MS).length
  if (!ranked) return { total: rows.length, newToday }
  const bands = {}
  for (const row of rows) {
    const grade = gradeFor(row.matchScore)
    bands[grade] = (bands[grade] ?? 0) + 1
  }
  return { total: rows.length, newToday, bands }
}

// groupRank and groupSourceCount are query scaffolding: one picked the row
// that leads its group, the other fed the ghost signals, and neither is a
// field a card shows. externalId, groupKey and currency were never part of
// the feed's row either, and features are what the fit read, already
// explained by why. No window value means a group of one.
const SCAFFOLDING = ['groupRank', 'groupSourceCount', 'externalId', 'groupKey', 'currency', 'features']

function toPosting(row) {
  const out = { ...row, groupCount: Number(row.groupCount ?? 1), matchScore: Number(row.matchScore ?? 0) }
  for (const key of SCAFFOLDING) delete out[key]
  return out
}

// Counted here so the numbers cover the whole corpus, not one page.
export async function listSources(store) {
  const counts = new Map()
  for (const { source } of store.corpus.rows()) counts.set(source, (counts.get(source) ?? 0) + 1)
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export async function setPostingStatus(store, userId, postingId, status) {
  const { [postingId]: previous, ...rest } = store.statuses.get(userId) ?? {}
  store.statuses.set(userId, status === null ? rest : { ...rest, [postingId]: status })
}
