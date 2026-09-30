import { isThrottled, HTML } from './avature-list.js'
import { parseDetail } from './avature-page.js'

// A posting's page is a whole HTML page of 60 to 110 KB, not a small JSON
// answer, so they are read one at a time with a pause before each, never
// two at once against one company's portal.
//
// A failed posting is left out and the rest carry on; once the portal
// answers 429 nothing more is sent to it this run. A page with no prose the
// parser recognises counts as failed too: a portal that changed its
// template should show up as a source with no readable detail, not as
// postings that quietly lost their bodies.
export async function readDetails(http, rows, pause) {
  const details = new Map()
  let throttled = false
  for (const row of rows) {
    await pause()
    try {
      const info = parseDetail(await (await http(row.url, HTML)).text())
      if (info.description) details.set(row.id, info)
    } catch (err) {
      if (isThrottled(err)) {
        throttled = true
        break
      }
    }
  }
  return { details, throttled }
}
