import { providerById } from '../ai/providers.js'

// A model is saved only if its AI lists it, so a name typed by hand, a cloud
// model Ollama's detection leaves out, or an id Antigravity's account cannot
// run never becomes the one a call is bound to. The probe is cached for a
// minute, so a model pulled (or an account signed in) since the list was
// read is looked for once more with a fresh one before the save is refused.
//
// -> null when every model named is listed, else the sentence refusing the
// first that is not.
export async function unlistedModel(app, models) {
  for (const [providerId, id] of Object.entries(models)) {
    if (!(await listed(app, providerId, id))) return refusal(providerById(providerId), id)
  }
  return null
}

async function listed(app, providerId, id) {
  const has = (rows) => rows.find((p) => p.id === providerId)?.models?.some((m) => m.id === id) ?? false
  return has(await app.ai.detect()) || has(await app.ai.detect({ refresh: true }))
}

// Ollama's models are installed on this computer; a CLI's are offered by it.
const refusal = (provider, id) => (provider.local
  ? `${provider.label} has no model called "${id}" on this computer. Pick one of the models it lists.`
  : `${provider.label} does not offer a model called "${id}". Pick one of the models it lists.`)
