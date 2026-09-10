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

export async function getUserFilters(store, userId) {
  const record = store.filters.get(userId)
  return record ? normalizeFilters(record) : null
}

export async function upsertUserFilters(store, userId, filters) {
  store.filters.set(userId, normalizeFilters(filters))
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

export async function getNotificationPrefs(store, userId) {
  const record = store.notifications.get(userId)
  if (!record) return null
  const { channel, telegramChatId, enabled } = record
  return normalizePrefs({ channel, telegramChatId, enabled })
}

export async function upsertNotificationPrefs(store, userId, prefs) {
  store.notifications.set(userId, normalizePrefs(prefs))
}

// Notifier query

export async function listUsersForNotify(store) {
  const results = []
  for (const [userId, p] of store.notifications.all()) {
    if (p.enabled !== true || p.channel == null || p.channel === 'none') continue
    const filters = store.filters.get(userId)
    results.push({
      userId,
      prefs: normalizePrefs(p),
      filters: filters ? normalizeFilters(filters) : null,
    })
  }
  return results
}
