// Career Site Builder pages are HTML rendered per request, 80 to 200 KB each,
// heavier on the site than a JSON call. So one board's requests go one at a
// time, with a pause before each after the first, and a first run describing
// 40 postings takes about a minute alongside the other sources.
export const PAUSE_MS = 500

export const isThrottled = (err) => /\bHTTP 429\b/.test(String(err?.message || err))

const sleep = () => new Promise((resolve) => setTimeout(resolve, PAUSE_MS))

// One per board per run, shared by the search pages and the job pages so the
// pause holds across both. Accept asks for the page a browser gets; http.js
// would otherwise ask for JSON.
export function pacedGet(http, pause = sleep) {
  let sent = 0
  return async function get(url) {
    if (sent++ > 0) await pause()
    const res = await http(url, { headers: { Accept: 'text/html' } })
    return res.text()
  }
}
