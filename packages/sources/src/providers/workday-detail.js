import { isThrottled } from './workday-list.js'

// Two requests in flight per careers site, each lane pausing before its next.
// One at a time made a company with a full window take about 40 seconds, and
// with a hundred Workday boards configured the scrape grew by minutes; two
// lanes halve that and stay well under what one visitor's browser opens.
const LANES = 2

// A posting's own page carries what the list leaves out: the body, the exact
// start date, and each location where the list says only "3 Locations".
// A failed posting is left out and the rest carry on; once the host answers
// 429 both lanes stop and nothing more is sent to it this run.
export async function readDetails(http, site, rows, pause) {
  const details = new Map()
  const queue = rows.filter((row) => row?.externalPath)
  let next = 0
  let throttled = false
  async function lane() {
    while (!throttled && next < queue.length) {
      const row = queue[next++]
      await pause()
      if (throttled) return
      try {
        const res = await http(`${site.detailBase}${row.externalPath}`)
        const info = (await res.json())?.jobPostingInfo
        if (info) details.set(row.externalPath, info)
      } catch (err) {
        if (isThrottled(err)) throttled = true
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(LANES, queue.length) }, lane))
  return { details, throttled }
}
