// Which model a provider that runs models on this computer (Ollama) answers
// with, bound onto the provider select.js hands back so the choice travels
// with it through fallback.js to call.js unchanged. The person's pick when
// it is still installed; otherwise the first installed, so a model deleted
// since it was picked, or none picked yet, does not break every call.
//
// Only the models detection listed can be bound, and detection lists only
// the ones that run here (see ollama-probe.js), so no saved name, however
// it got into the file, can route a prompt to a cloud model.
//
// A provider whose detection lists no models is handed back as it is, the
// very same object, which is every CLI.
export function withModel(provider, detected, saved) {
  const models = detected.find((p) => p.id === provider.id)?.models
  if (!Array.isArray(models) || !models.length) return provider
  return { ...provider, model: models.find((m) => m.name === saved) ?? models[0] }
}
