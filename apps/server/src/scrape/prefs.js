import { linkedinChoice } from '@jobdekho/scraper/linkedin-setting.js'

// The refresh switches. `autoRefresh`: whether the running server refreshes
// postings on its own once a day (see auto.js); on unless the person turned
// it off, since the point is that nobody has to remember to fetch new
// postings. `linkedin`: whether a refresh reads LinkedIn at all, which every
// scrape path reads for itself (see the scraper's linkedin-setting.js, whose
// rule this uses, so the two can never disagree about the default). Kept per
// user, like the AI CLI preference, though there is one corpus: JobDekho's
// one local person is the only one who could have set them. Anything but a
// real boolean in the file reads as its default: the daily refresh on,
// LinkedIn off.
const DEFAULT_AUTO_REFRESH = true

export function normalizeRefreshPref(input) {
  return {
    autoRefresh: typeof input?.autoRefresh === 'boolean' ? input.autoRefresh : DEFAULT_AUTO_REFRESH,
    linkedin: linkedinChoice(input?.linkedin),
  }
}

export function readRefreshPref(store, userId) {
  return normalizeRefreshPref(userId ? store.scrapeSettings.get(userId) : null)
}

// Each switch is saved the moment it is flipped, on its own, so a change
// names only the one that moved and the other keeps its saved value.
export function saveRefreshPref(store, userId, change) {
  const current = readRefreshPref(store, userId)
  const next = Object.fromEntries(Object.entries(current).map(([key, value]) => [
    key, typeof change?.[key] === 'boolean' ? change[key] : value,
  ]))
  store.scrapeSettings.set(userId, next)
}
