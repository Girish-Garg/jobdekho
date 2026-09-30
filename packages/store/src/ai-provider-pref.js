// Which AI CLI to prefer when more than one is installed. 'auto' is
// "whichever is available", today's behaviour and the default; anything
// else is a provider id (see apps/server/src/ai/providers.js), read back as
// a plain string so an id this build no longer knows about degrades to
// "not eligible" rather than a crash (see select.js).
//
// Beside it, `models`: which model each AI answers with, by provider id,
// { claude?, agy?, ollama? }. One left out means that AI's default (see
// ai/model-choice.js). Each is checked against what that AI lists when it is
// saved (api/ai-provider.js), not here: this layer cannot see the AIs, and a
// model gone since then is handled where the call is made, so a stale name
// is kept as the plain string it is.
//
// Before every AI had a model, Ollama's alone was saved as `ollamaModel`. A
// record from then reads as `models.ollama`, so the pick is not lost, and
// the next save writes it in the new shape.
const AUTO = 'auto'

// Provider ids are short lowercase words; any other key, however it got into
// the file, is not a provider's and is dropped.
const PROVIDER_ID = /^[a-z][a-z0-9-]{0,31}$/

const text = (value) => (typeof value === 'string' && value ? value : null)

function modelsOf(input) {
  const models = {}
  const legacy = text(input?.ollamaModel)
  if (legacy) models.ollama = legacy
  const given = input?.models
  if (!given || typeof given !== 'object' || Array.isArray(given)) return models
  for (const [id, model] of Object.entries(given)) {
    if (PROVIDER_ID.test(id) && text(model)) models[id] = model
  }
  return models
}

export function normalizeProviderPref(input) {
  return { provider: text(input?.provider) ?? AUTO, models: modelsOf(input) }
}

export async function getProviderPref(store, userId) {
  const record = store.aiProvider.get(userId)
  return record ? normalizeProviderPref(record) : null
}

export async function upsertProviderPref(store, userId, pref) {
  store.aiProvider.set(userId, normalizeProviderPref(pref))
}
