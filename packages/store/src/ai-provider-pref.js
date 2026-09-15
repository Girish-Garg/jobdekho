// Which AI CLI to prefer when more than one is installed. 'auto' is
// "whichever is available", today's behaviour and the default; anything
// else is a provider id (see apps/server/src/ai/providers.js), read back as
// a plain string so an id this build no longer knows about degrades to
// "not eligible" rather than a crash (see select.js).
const AUTO = 'auto'

export function normalizeProviderPref(input) {
  const provider = input?.provider
  return { provider: typeof provider === 'string' && provider ? provider : AUTO }
}

export async function getProviderPref(store, userId) {
  const record = store.aiProvider.get(userId)
  return record ? normalizeProviderPref(record) : null
}

export async function upsertProviderPref(store, userId, pref) {
  store.aiProvider.set(userId, normalizeProviderPref(pref))
}
