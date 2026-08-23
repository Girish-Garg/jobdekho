async function runOne(adapter, http, retries) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return { ok: true, raws: await adapter.fetch(http), error: null }
    } catch (err) {
      lastError = err
    }
  }
  return { ok: false, raws: [], error: String(lastError?.message || lastError) }
}

// ~90 sources means a serial run is dominated by whichever handful are dead
// (15s timeout, one retry, each). A pool bounds how many run at once, which
// also caps how many hosts get hit at the same moment and how many responses
// sit in memory together, rather than firing all ~90 requests at once.
const POOL = 8

export async function runAdapters(adapters, http, { retries = 1 } = {}) {
  const items = []
  const results = new Array(adapters.length)
  let next = 0

  async function worker() {
    while (next < adapters.length) {
      const i = next++
      const adapter = adapters[i]
      const r = await runOne(adapter, http, retries)
      // Written by index, not pushed, so completion order (which the pool
      // scrambles) cannot reorder the summary the run stores and reports.
      results[i] = { name: adapter.name, ok: r.ok, count: r.raws.length, error: r.error }
      for (const raw of r.raws) items.push({ source: adapter.name, raw })
    }
  }

  await Promise.all(Array.from({ length: Math.min(POOL, adapters.length) }, worker))
  return { items, results }
}
