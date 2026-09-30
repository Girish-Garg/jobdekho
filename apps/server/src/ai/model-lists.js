// The models each CLI lists, kept apart from detection's one-minute cache
// because a listing can cost far more than the version probe beside it:
// measured on this machine, `agy models` took about six seconds where
// `agy --version` took 0.15. Detection is asked before every AI call, so a
// listing redone every minute would hold up a call every minute for a list
// that changes when the person signs in or their plan changes, not between
// calls.
//
// So a list, once read, is served at once, and read again in the background
// when it is older than LIST_TTL_MS; only the first read of each, and a
// refresh the person asked for ("Check again", or a save naming a model the
// list does not have yet, see api/ai-model-check.js), waits for the CLI.
const LIST_TTL_MS = 10 * 60 * 1000

export function createModelLists({ ttlMs = LIST_TTL_MS, now = Date.now } = {}) {
  const cache = new Map()
  return async function listModels(provider, { run, path, refresh = false }) {
    if (!provider.listModels) return []
    const key = `${provider.id}\n${path}`
    const entry = cache.get(key) ?? { at: -Infinity, value: null, pending: null }
    cache.set(key, entry)
    if ((refresh || now() - entry.at >= ttlMs) && !entry.pending) {
      entry.pending = Promise.resolve()
        .then(() => provider.listModels({ run, path }))
        .catch(() => entry.value ?? [])
        .then((value) => Object.assign(entry, { value, at: now(), pending: null }).value)
    }
    return entry.value && !refresh ? entry.value : entry.pending ?? entry.value
  }
}
