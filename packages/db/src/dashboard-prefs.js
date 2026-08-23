import { eq, and, isNotNull } from 'drizzle-orm'
import { userFilters, notificationPrefs } from './schema.js'

// Filters

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

export async function getUserFilters(db, userId) {
  const rows = await db.select().from(userFilters).where(eq(userFilters.userId, userId))
  if (!rows[0]) return null
  return normalizeFilters(rows[0])
}

export async function upsertUserFilters(db, userId, filters) {
  const data = normalizeFilters(filters)
  await db.insert(userFilters)
    .values({ userId, ...data })
    .onConflictDoUpdate({ target: userFilters.userId, set: data })
}

// Notification prefs

export function normalizePrefs(input) {
  const src = input ?? {}
  return {
    channel: src.channel ?? 'none',
    telegramChatId: src.telegramChatId ?? null,
    enabled: src.enabled ?? true,
  }
}

export async function getNotificationPrefs(db, userId) {
  const rows = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId))
  if (!rows[0]) return null
  const { channel, telegramChatId, enabled } = rows[0]
  return normalizePrefs({ channel, telegramChatId, enabled })
}

export async function upsertNotificationPrefs(db, userId, prefs) {
  const data = normalizePrefs(prefs)
  await db.insert(notificationPrefs)
    .values({ userId, ...data })
    .onConflictDoUpdate({ target: notificationPrefs.userId, set: data })
}

// Notifier query

export async function listUsersForNotify(db) {
  const prefs = await db.select().from(notificationPrefs)
    .where(and(eq(notificationPrefs.enabled, true), isNotNull(notificationPrefs.channel)))
  const results = []
  for (const p of prefs) {
    if (p.channel === 'none') continue
    const filterRows = await db.select().from(userFilters).where(eq(userFilters.userId, p.userId))
    results.push({
      userId: p.userId,
      prefs: normalizePrefs(p),
      filters: filterRows[0] ? normalizeFilters(filterRows[0]) : null,
    })
  }
  return results
}
