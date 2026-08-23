import { eq, and, desc, count, sql } from 'drizzle-orm'
import { postings, userPostings } from './schema.js'
import { postingConditions, clampPage } from './posting-filters.js'
import { orderFor, groupCountColumn, groupRankColumn } from './posting-order.js'
import { scoreColumn, canRank } from './posting-score.js'

export function normalizePrefs(input) {
  const src = input ?? {}
  return {
    channel: src.channel ?? 'none',
    telegramChatId: src.telegramChatId ?? null,
    enabled: src.enabled ?? true,
  }
}

export function normalizeFilters(input) {
  const src = input ?? {}
  return {
    includeKeywords: src.includeKeywords ?? [],
    excludeKeywords: src.excludeKeywords ?? [],
    locations: src.locations ?? [],
    levels: src.levels ?? [],
    sources: src.sources ?? [], excludedSources: src.excludedSources ?? [],
    workModes: src.workModes ?? [],
    maxDegree: src.maxDegree ?? null,
    minStipend: src.minStipend ?? null,
    maxDurationMonths: src.maxDurationMonths ?? null,
    maxExperienceYears: src.maxExperienceYears ?? null,
  }
}

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
  const ranked = db
    .select({
      ...POSTING_COLUMNS,
      groupCount: groupCountColumn.as('group_count'),
      groupRank: groupRankColumn.as('group_rank'),
      matchScore: (ranks ? scoreColumn(opts.profile) : sql`0`).as('match_score'),
    })
    .from(postings)
    .leftJoin(userPostings,
      and(eq(userPostings.postingId, postings.id), eq(userPostings.userId, userId)))
    .where(conditions.length ? and(...conditions) : undefined)
    .as('ranked')

  let query = db.select().from(ranked)
  if (opts.group !== false) query = query.where(eq(ranked.groupRank, 1))
  const rows = await query.orderBy(...orderFor(sort, ranked)).limit(limit).offset(offset)
  return applyStatusFilter(rows.map(toPosting), opts.status)
}

// group_rank is query scaffolding; no window value means a group of one.
function toPosting({ groupRank, groupCount, matchScore, ...rest }) {
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
