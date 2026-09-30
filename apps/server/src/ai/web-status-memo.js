// Whether Ollama can search the web, held for ten minutes. The last step of
// finding out (see ollama-web-probe.js) asks ollama.com, through the local
// server, whether the person is signed in, and detection is asked before
// every AI call of any CLI: without this, using Claude Code all afternoon
// would have Ollama's server call ollama.com once a minute for someone who
// never picked Ollama. A person who has just signed in presses "Check
// again", which asks afresh. An answer that ollama.com did not reply is not
// kept, since it says nothing about the next minute.
//
// `key` is what the answer depends on locally (which installed models use
// tools), so pulling or removing one is noticed at once.
const WEB_TTL_MS = 10 * 60 * 1000

export function createWebMemo({ ttlMs = WEB_TTL_MS, now = Date.now } = {}) {
  let entry = null
  return async function remember(key, work, { refresh = false, keep = () => true } = {}) {
    if (!refresh && entry && entry.key === key && now() - entry.at < ttlMs) return entry.value
    const value = await work()
    entry = keep(value) ? { key, at: now(), value } : null
    return value
  }
}

// For a caller with no memo (a test, a one-off probe): asks every time.
export const noMemo = (key, work) => work()
