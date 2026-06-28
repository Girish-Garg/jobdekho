import { eq, and, desc, or, ilike } from 'drizzle-orm'
import { postings, userPostings } from './schema.js'

// Pure helpers (also used in dashboard-prefs.js; tested in dashboard.test.js)
export function normalizePrefs(input) {
  const src = input ?? {}
  return {
    channel: src.channel ?? 'none',
    telegramChatId: src.telegramChatId ?? null,
    email: src.email ?? null,
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
  if (q) conditions.push(or(ilike(postings.title, `%${q}%`), ilike(postings.company, `%${q}%`)))
  const rows = await db
    .select({
      id: postings.id, source: postings.source, company: postings.company,
      title: postings.title, location: postings.location, url: postings.url,
      descriptionSnippet: postings.descriptionSnippet, tags: postings.tags,
      postedAt: postings.postedAt, firstSeenAt: postings.firstSeenAt,
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
