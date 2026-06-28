import { eq, and, isNotNull } from 'drizzle-orm'
import { userFilters, notificationPrefs } from './schema.js'
import { normalizeFilters, normalizePrefs } from './dashboard.js'

// Filters

export async function getUserFilters(db, userId) {
  const rows = await db.select().from(userFilters).where(eq(userFilters.userId, userId))
  if (!rows[0]) return null
  const { includeKeywords, excludeKeywords, locations } = rows[0]
  return normalizeFilters({ includeKeywords, excludeKeywords, locations })
}

export async function upsertUserFilters(db, userId, filters) {
  const data = normalizeFilters(filters)
  await db.insert(userFilters)
    .values({ userId, ...data })
    .onConflictDoUpdate({ target: userFilters.userId, set: data })
}

// Notification prefs

export async function getNotificationPrefs(db, userId) {
  const rows = await db.select().from(notificationPrefs).where(eq(notificationPrefs.userId, userId))
  if (!rows[0]) return null
  const { channel, telegramChatId, email, enabled } = rows[0]
  return normalizePrefs({ channel, telegramChatId, email, enabled })
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
