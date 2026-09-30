import { detailUrl, getJson, isThrottled } from './oracle-api.js'
import { idOf } from './oracle-posting.js'

// Two requests in flight per board, each lane pausing before its next: the
// same pace as a Workday board, well under what one visitor's browser opens.
const LANES = 2

// A posting's detail carries what the list leaves out: the body and the
// exact time it went up. A failed posting is left out and the rest carry on;
// once the host answers 429 both lanes stop and nothing more is sent to it
// this run.
export async function readDetails(http, site, rows, pause) {
  const details = new Map()
  let next = 0
  let throttled = false
  async function lane() {
    while (!throttled && next < rows.length) {
      const id = idOf(rows[next++])
      await pause()
      if (throttled) return
      try {
        const info = (await getJson(http, detailUrl(site, id)))?.items?.[0]
        if (info) details.set(id, info)
      } catch (err) {
        if (isThrottled(err)) throttled = true
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(LANES, rows.length) }, lane))
  return { details, throttled }
}
