// Which AI CLI to prefer when more than one is installed. 'auto' is
// "whichever is available", today's behaviour and the default; anything
// else is a provider id (see apps/server/src/ai/providers.js), read back as
// a plain string so an id this build no longer knows about degrades to
// "not eligible" rather than a crash (see select.js).
//
// Beside it, `ollamaModel`: which installed Ollama model answers whenever
// Ollama does. Left out until one is picked, which means Ollama's first
// model (see ai/model-choice.js). It is checked against what Ollama has
// installed when it is saved (api/ai-provider.js), not here: this layer
// cannot see Ollama, and a model removed since then is handled where the
// call is made, so a stale name is kept as the plain string it is.
const AUTO = 'auto'

const text = (value) => (typeof value === 'string' && value ? value : null)

export function normalizeProviderPref(input) {
  const model = text(input?.ollamaModel)
  return { provider: text(input?.provider) ?? AUTO, ...(model && { ollamaModel: model }) }
}

export async function getProviderPref(store, userId) {
  const record = store.aiProvider.get(userId)
  return record ? normalizeProviderPref(record) : null
}

export async function upsertProviderPref(store, userId, pref) {
  store.aiProvider.set(userId, normalizeProviderPref(pref))
}
