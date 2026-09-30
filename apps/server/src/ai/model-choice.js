// Which model a provider answers with, bound onto the provider select.js
// hands back so the choice travels with it through fallback.js to call.js
// unchanged. The person's pick when detection still lists it; otherwise the
// first listed, which for a CLI is "Default" (no flag, the CLI's own choice,
// see cli-models.js) and for Ollama its first installed model, so a model
// gone since it was picked, or none picked yet, does not break every call.
//
// Only the models detection listed can be bound, and detection lists only
// the ones that run here for Ollama (see ollama-probe.js) and ids of plain
// characters for a CLI (see agy-models.js), so no saved name, however it got
// into the file, can route a prompt to a cloud model or put anything else on
// a command line.
//
// A provider may take only some of its models under a policy (Ollama's web
// call needs one that uses tools, see ollama.js): the pick is kept when it
// can, and the first that can answers otherwise.
//
// A provider whose detection lists no models is handed back as it is, the
// very same object.
export function withModel(provider, detected, saved, policy = 'none') {
  const listed = detected.find((p) => p.id === provider.id)?.models
  const models = (Array.isArray(listed) ? listed : []).filter((m) => provider.canUse?.(m, policy) ?? true)
  if (!models.length) return provider
  return { ...provider, model: models.find((m) => m.id === saved) ?? models[0] }
}
