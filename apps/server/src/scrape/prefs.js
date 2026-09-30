// Whether the running server refreshes postings on its own once a day (see
// auto.js). On unless the person turned it off: the point is that nobody has
// to remember to fetch new postings. Kept per user, like the AI CLI
// preference, though there is one corpus: JobDekho's one local person is the
// only one who could have set it. Anything but a real boolean in the file
// reads as the default rather than as "off".
const DEFAULT_AUTO_REFRESH = true

export function normalizeRefreshPref(input) {
  return { autoRefresh: typeof input?.autoRefresh === 'boolean' ? input.autoRefresh : DEFAULT_AUTO_REFRESH }
}

export function readRefreshPref(store, userId) {
  return normalizeRefreshPref(userId ? store.scrapeSettings.get(userId) : null)
}

export function saveRefreshPref(store, userId, pref) {
  store.scrapeSettings.set(userId, normalizeRefreshPref(pref))
}
