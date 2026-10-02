import { compactKey } from '@jobdekho/core/company-key.js'

// The companies a person never wants to see again: one they found to be
// fake, one they would not work for. Each is
//   { key, name, blockedAt, stopFetching }
// `key` is core's company key run together (see company-key.js), so every
// spelling of the employer goes with it, "PHONEPE LIMITED" and a slug's
// "PhonePeLimited" alike; `name` is the spelling it was blocked under, for
// Settings to show; `stopFetching` says whether its own careers page is left
// unread as well (see the scraper's blocked.js). Its postings leave the feed,
// the company menu and the chat (see dashboard.js), and a scrape stops
// keeping new ones, so they never come back. Kept per user with the other
// files the person made, never with the corpus a scrape rewrites.

// Longer than any company's name: a pasted page, not a name.
const MAX_NAME = 200

// The file is the person's to open and edit, so an entry is read with care:
// one without a key is skipped rather than failing every read of the feed.
function entryOf(raw) {
  if (typeof raw?.key !== 'string' || !raw.key) return null
  return {
    key: raw.key,
    name: typeof raw.name === 'string' && raw.name ? raw.name : raw.key,
    blockedAt: typeof raw.blockedAt === 'string' ? raw.blockedAt : null,
    stopFetching: raw.stopFetching === true,
  }
}

// Newest first, the order Settings lists them in.
export function listBlockedCompanies(store, userId) {
  const record = store.blockedCompanies.get(userId)
  return (Array.isArray(record) ? record : []).map(entryOf).filter(Boolean)
}

export function blockedKeys(store, userId) {
  return new Set(listBlockedCompanies(store, userId).map((entry) => entry.key))
}

// Which of `names` (the feed's company picks) a block hides, so the page can
// let go of them rather than stay titled with a company it will never show.
export function blockedAmong(keys, names) {
  return keys.size ? (names ?? []).filter((name) => keys.has(compactKey(name))) : []
}

// Blocking a company already blocked adds nothing, except that it may turn
// the careers page off: asking again to be rid of a company never brings its
// page back. A name with no letters or digits has no key to be known by, and
// is refused with null.
export function blockCompany(store, userId, { name, stopFetching = false } = {}, now = Date.now()) {
  const shown = String(name ?? '').trim().slice(0, MAX_NAME)
  const key = compactKey(shown)
  if (!key) return null
  const list = listBlockedCompanies(store, userId)
  const held = list.find((entry) => entry.key === key)
  if (held && (held.stopFetching || stopFetching !== true)) return held
  const entry = held
    ? { ...held, stopFetching: true }
    : { key, name: shown, blockedAt: new Date(now).toISOString(), stopFetching: stopFetching === true }
  store.blockedCompanies.set(userId, held ? list.map((e) => (e.key === key ? entry : e)) : [entry, ...list])
  return entry
}

// By the key the list gave rather than by a name, since that is what Settings
// holds. False when nothing was blocked under it.
export function unblockCompany(store, userId, key) {
  const list = listBlockedCompanies(store, userId)
  const rest = list.filter((entry) => entry.key !== key)
  if (rest.length === list.length) return false
  if (rest.length) store.blockedCompanies.set(userId, rest)
  else store.blockedCompanies.remove(userId)
  return true
}
