import { eq, and, gte, desc, count, sql } from 'drizzle-orm'
import { idfWeights } from '@jobdekho/core/fit-dimensions.js'
import { normalizeProfile } from '@jobdekho/core/profile.js'
import { postings, userPostings } from './schema.js'
import { postingConditions, clampPage } from './posting-filters.js'
import { toNumber } from './posting-measures.js'
import { orderFor, groupCountColumn, groupRankColumn, groupSourceCountColumn } from './posting-order.js'
import { scoreColumn, canRank } from './posting-score.js'
import { attachText } from './page-text.js'
import { skillDocFreq } from './skill-doc-freq.js'
import { withFit, withGhost } from './posting-fit.js'

export function applyStatusFilter(rows, status) {
  const normalized = rows.map((r) => ({ ...r, status: r.status ?? null }))
  return status === undefined ? normalized : normalized.filter((r) => r.status === status)
}

const POSTING_COLUMNS = {
  id: postings.id, source: postings.source, company: postings.company,
  title: postings.title, location: postings.location, url: postings.url,
  descriptionSnippet: postings.descriptionSnippet, tags: postings.tags,
  stipend: postings.stipend, duration: postings.duration, experience: postings.experience,
  postedAt: postings.postedAt, firstSeenAt: postings.firstSeenAt, lastSeenAt: postings.lastSeenAt,
  stipendMin: postings.stipendMin, durationMonths: postings.durationMonths, experienceYears: postings.experienceYears,
  type: postings.type, level: postings.level, workMode: postings.workMode,
  degreeMin: postings.degreeMin, degreeRequired: postings.degreeRequired,
  status: userPostings.status,
}

// Ranking precedes LIMIT and a window function cannot sit in a WHERE, so the
// ranked set is a subquery the outer select pages over.
export async function listPostingsForUser(db, userId, opts = {}) {
  const conditions = postingConditions(opts)
  const { limit, offset } = clampPage(opts)
  // An empty profile scores every row alike, so fall back to normal ordering.
  const ranks = opts.sort === 'match' && canRank(opts.profile)
  const sort = ranks ? 'match' : (opts.sort === 'match' ? 'newest' : opts.sort)
  // Rarity comes from a cached corpus scan; without it ranking runs unweighted.
  const { docFreq, totalDocs } = ranks
    ? await skillDocFreq(db, normalizeProfile(opts.profile).skills)
    : { docFreq: {}, totalDocs: 0 }
  const idf = idfWeights(docFreq, totalDocs)
  const ranked = db
    .select({
      ...POSTING_COLUMNS,
      groupCount: groupCountColumn.as('group_count'),
      groupRank: groupRankColumn.as('group_rank'),
      groupSourceCount: groupSourceCountColumn.as('group_source_count'),
      matchScore: (ranks ? scoreColumn(opts.profile, idf) : sql`0`).as('match_score'),
    })
    .from(postings)
    .leftJoin(userPostings,
      and(eq(userPostings.postingId, postings.id), eq(userPostings.userId, userId)))
    .where(conditions.length ? and(...conditions) : undefined)
    .as('ranked')

  const gate = []
  if (opts.group !== false) gate.push(eq(ranked.groupRank, 1))
  // The floor only means anything against a real score. Unranked, every row
  // "scores" zero, so applying it would empty the feed rather than filter it.
  const minFit = ranks ? toNumber(opts.minFit) : null
  if (minFit) gate.push(gte(ranked.matchScore, minFit))
  let query = db.select().from(ranked)
  if (gate.length) query = query.where(and(...gate))
  const paged = await query.orderBy(...orderFor(sort, ranked)).limit(limit).offset(offset)
  // Ghost detection reads the description on every feed, ranked or not, so it
  // is attached after paging rather than carried through the subquery.
  const rows = await attachText(db, paged)
  const page = rows.map((row) => toPosting(ranks ? withFit(row, opts.profile, idf) : withGhost(row)))
  return applyStatusFilter(page, opts.status)
}

// group_rank and group_source_count are query scaffolding, not fields the
// browser needs; no window value means a group of one.
function toPosting({ groupRank, groupCount, groupSourceCount, matchScore, ...rest }) {
  return { ...rest, groupCount: Number(groupCount ?? 1), matchScore: Number(matchScore ?? 0) }
}

// Counted here so the numbers cover the whole table, not one page.
export async function listSources(db) {
  const rows = await db
    .select({ name: postings.source, count: count() })
    .from(postings)
    .groupBy(postings.source)
    .orderBy(desc(count()))
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }))
}

export async function setPostingStatus(db, userId, postingId, status) {
  if (status === null) {
    await db.delete(userPostings)
      .where(and(eq(userPostings.userId, userId), eq(userPostings.postingId, postingId)))
    return
  }
  await db.insert(userPostings)
    .values({ userId, postingId, status })
    .onConflictDoUpdate({ target: [userPostings.userId, userPostings.postingId], set: { status } })
}
