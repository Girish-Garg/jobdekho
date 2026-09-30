import { retryable } from './retry.js'
import { interleave } from './interleave.js'

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// `context` is what an adapter may ask of the run (see scrape.js): which
// postings the store already describes, and which the filter would keep.
// Only a failure a second try could mend is tried again (see retry.js), after
// `delayMs`, so a dead board costs one request rather than two.
async function runOne(adapter, http, { retries, context, delayMs, wait }) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt && delayMs) await wait(delayMs)
    try {
      return { ok: true, raws: await adapter.fetch(http, context), error: null }
    } catch (err) {
      lastError = err
      if (!retryable(err)) break
    }
  }
  return { ok: false, raws: [], error: String(lastError?.message || lastError) }
}

// ~280 sources means a serial run is dominated by whichever handful are dead
// (15s timeout each). A pool bounds how many run at once, which also caps how
// many responses sit in memory together; the per-host gate in http.js keeps
// the ones running at once off each other's hosts.
const POOL = 8

// What the run records of one source. `note` is an adapter's word on a run
// cut short but not failed (LinkedIn stopping at a refusal with what it had);
// `complete` says the source listed everything it has (see scrape.js, which
// closes postings a complete source stopped listing).
function resultOf(adapter, r) {
  return {
    name: adapter.name, ok: r.ok, count: r.raws.length, error: r.error,
    ...(adapter.note ? { note: adapter.note } : {}),
    ...(r.ok && adapter.complete ? { complete: true } : {}),
  }
}

// onResult(result, { done, total }) hears each source as it settles, in the
// order they settle, so a watcher (the server's refresh job) can say how far
// the run has got. The CLI does not listen: it prints the summary at the end.
// The work runs in interleave.js's order; results keep the input order.
export async function runAdapters(adapters, http, {
  retries = 1, onResult = () => {}, context, delayMs = 0, wait = pause, order = interleave(adapters),
} = {}) {
  const items = []
  const results = new Array(adapters.length)
  let next = 0
  let done = 0

  async function worker() {
    while (next < order.length) {
      const i = order[next++]
      const adapter = adapters[i]
      const r = await runOne(adapter, http, { retries, context, delayMs, wait })
      results[i] = resultOf(adapter, r)
      for (const raw of r.raws) items.push({ source: adapter.name, raw })
      done += 1
      onResult(results[i], { done, total: adapters.length })
    }
  }

  await Promise.all(Array.from({ length: Math.min(POOL, adapters.length) }, worker))
  return { items, results }
}
