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

export async function runAdapters(adapters, http, { retries = 1 } = {}) {
  const items = []
  const results = []
  for (const adapter of adapters) {
    const r = await runOne(adapter, http, retries)
    results.push({ name: adapter.name, ok: r.ok, count: r.raws.length, error: r.error })
    for (const raw of r.raws) items.push({ source: adapter.name, raw })
  }
  return { items, results }
}
