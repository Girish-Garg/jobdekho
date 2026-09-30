import { checkTarget } from './link-target.js'
import { verdict } from './closed-signs.js'

// Links checked per run. Each is one request (two or three when a board
// redirects), paced by the caller's gate at one request per host every few
// seconds, so the check adds a minute or two to a run at most.
export const LINK_BUDGET = 40
const MAX_HOPS = 3
const LANES = 4

// One posting's link, followed by hand so a redirect can be judged: a board
// that sends a closed job to its own listing ("?error=true") has said the job
// is gone. Every hop must be one robots.txt allows. A page is read only when
// it answered 200, the one case whose words can matter.
async function probe(http, allowed, target) {
  let url = target
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    if (!(await allowed(url))) return 'unknown'
    const res = await http(url, { anyStatus: true, redirect: 'manual', headers: { Accept: 'text/html,application/json;q=0.9' } })
    const location = res.headers?.get?.('location') ?? null
    const body = res.status === 200 ? await res.text() : ''
    const said = verdict({ target: url, status: res.status, location, body })
    if (said !== 'follow') return said
    url = new URL(location, url).href
  }
  return 'unknown'
}

// `rows` in the order to check them, most at risk of going stale first.
// `allowed(url)` is the run's robots check (see robots/robots-check.js). A
// posting with nothing to check, or whose link robots.txt disallows, is passed
// over without spending the budget. Anything but a clear answer (an error, a
// timeout, a refusal) proves nothing: that posting is left as it was.
export async function checkLinks(rows, { http, allowed, budget = LINK_BUDGET }) {
  const gone = []
  const live = []
  let checked = 0
  let next = 0
  async function lane() {
    while (next < rows.length && checked < budget) {
      const row = rows[next++]
      const target = checkTarget(row)
      if (!target || !(await allowed(target)) || checked >= budget) continue
      checked += 1
      let said = 'unknown'
      try {
        said = await probe(http, allowed, target)
      } catch {
        said = 'unknown'
      }
      if (said === 'gone') gone.push(row.id)
      if (said === 'live') live.push(row.id)
    }
  }
  await Promise.all(Array.from({ length: LANES }, lane))
  return { gone, live, checked }
}
