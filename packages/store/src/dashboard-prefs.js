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
