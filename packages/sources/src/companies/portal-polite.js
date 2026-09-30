// What the company portal adapters share about asking politely: one request
// at a time with a pause before each, and a 429 read as "stop now". http.js
// throws on any non-2xx with the status first in the message, which is where
// the code is read from.
export const isThrottled = (err) => /\bHTTP 429\b/.test(String(err?.message || err))

export const pauseFor = (ms) => () => new Promise((resolve) => setTimeout(resolve, ms))

// Pages in the portal's own order until a short page, at most maxPages. The
// first page failing is the source failing, so it throws and the run records
// why. A later one is skipped so the pages already read still count, unless
// the host has started refusing: then the listing ends there.
export async function readPages(readPage, { maxPages, pageSize, pause }) {
  const rows = []
  for (let page = 0; page < maxPages; page++) {
    if (page) await pause()
    let got
    try {
      got = (await readPage(page)) || []
    } catch (err) {
      if (page === 0) throw err
      if (isThrottled(err)) return { rows, throttled: true }
      continue
    }
    rows.push(...got)
    if (got.length < pageSize) break
  }
  return { rows, throttled: false }
}

// The adapter the registry builds, around one run(http, context, adapter).
// run sets adapter.note when it stopped short but still has postings. A 429
// that leaves nothing is thrown, and the runner's retry of the same run gets
// that refusal back without the portal being asked again: adapters are built
// afresh for every run, so the next run starts clean.
export function politeAdapter(name, run) {
  let refused = null
  const adapter = {
    name,
    note: undefined,
    async fetch(http, context) {
      if (refused) throw new Error(refused)
      adapter.note = undefined
      try {
        return await run(http, context, adapter)
      } catch (err) {
        if (!isThrottled(err)) throw err
        refused = `${name} stopped: the careers site answered 429`
        throw new Error(refused)
      }
    },
  }
  return adapter
}
