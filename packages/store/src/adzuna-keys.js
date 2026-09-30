// The person's own Adzuna app id and key, pasted into Settings so nobody has
// to edit .env to turn Adzuna on. ADZUNA_APP_ID and ADZUNA_APP_KEY in the
// environment still work, for `npm run scrape` from a terminal and for
// anyone who set them up that way first; the pair saved in Settings wins,
// since it is the one the person chose most recently and can see.
//
// Kept whole on disk, like .env: the scrape has to send it. Everything that
// shows it (see the server's adzuna/view.js) shows the last four characters
// at most.
const PART = /^[A-Za-z0-9_-]{1,128}$/

// A pair is only a pair with both halves: an id with no key is no more use
// to Adzuna than nothing, and reads as nothing rather than as half a key.
export function normalizeAdzunaKeys(input) {
  const appId = typeof input?.appId === 'string' ? input.appId.trim() : ''
  const appKey = typeof input?.appKey === 'string' ? input.appKey.trim() : ''
  if (!PART.test(appId) || !PART.test(appKey)) return null
  return { appId, appKey }
}

export function savedAdzunaKeys(store, userId) {
  return userId ? normalizeAdzunaKeys(store.adzuna.get(userId)) : null
}

export function saveAdzunaKeys(store, userId, keys) {
  const pair = normalizeAdzunaKeys(keys)
  if (!pair) throw new Error('An Adzuna app id and key are both needed')
  store.adzuna.set(userId, pair)
}

export function clearAdzunaKeys(store, userId) {
  store.adzuna.remove(userId)
}

export function envAdzunaKeys(env = process.env) {
  return normalizeAdzunaKeys({ appId: env.ADZUNA_APP_ID, appKey: env.ADZUNA_APP_KEY })
}

// The pair a scrape or a check uses, and where it came from, or null when
// there is none. `from` is 'settings' or 'environment', for the card to say.
export function resolveAdzunaKeys(store, userId, env = process.env) {
  const saved = savedAdzunaKeys(store, userId)
  if (saved) return { ...saved, from: 'settings' }
  const fromEnv = envAdzunaKeys(env)
  return fromEnv ? { ...fromEnv, from: 'environment' } : null
}
