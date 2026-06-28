import { eq, and, desc, or, ilike } from 'drizzle-orm'
import { postings, userPostings } from './schema.js'

// Pure helpers (also used in dashboard-prefs.js; tested in dashboard.test.js)
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
  }
}

// Postings

export function escapeLike(s) {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

export function applyStatusFilter(rows, status) {
  const normalized = rows.map((r) => ({ ...r, status: r.status ?? null }))
  if (status === undefined) {
    return normalized
  }
  return normalized.filter((r) => r.status === status)
}

export async function listPostingsForUser(db, userId, { source, q, status } = {}) {
  const conditions = []
  if (source) conditions.push(eq(postings.source, source))
  if (q) { const eq_ = escapeLike(q); conditions.push(or(ilike(postings.title, `%${eq_}%`), ilike(postings.company, `%${eq_}%`))) }
  const rows = await db
    .select({
      id: postings.id, source: postings.source, company: postings.company,
      title: postings.title, location: postings.location, url: postings.url,
      descriptionSnippet: postings.descriptionSnippet, tags: postings.tags,
      stipend: postings.stipend, duration: postings.duration, experience: postings.experience,
      postedAt: postings.postedAt, firstSeenAt: postings.firstSeenAt,
      type: postings.type,
      status: userPostings.status,
    })
    .from(postings)
    .leftJoin(userPostings,
      and(eq(userPostings.postingId, postings.id), eq(userPostings.userId, userId)))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(postings.firstSeenAt))
  return applyStatusFilter(rows, status)
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
