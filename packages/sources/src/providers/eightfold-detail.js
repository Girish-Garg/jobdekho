import { isThrottled } from './eightfold-list.js'

// One request at a time, a pause before each. Workday runs two lanes;
// Eightfold gets one because a hosted tenant answered 429 to the very first
// API call made after its careers page loaded (eaton.eightfold.ai, September
// 2026), so its hosts are treated as the less forgiving kind.
//
// A failed posting is left out and the rest carry on; once the host answers
// 429 nothing more is sent to it this run. A position that arrives without
// a body counts as failed: were the field renamed, every posting would
// otherwise be stored without one and nothing would look wrong.
export async function readDetails(http, site, api, rows, pause) {
  const details = new Map()
  let throttled = false
  for (const row of rows) {
    await pause()
    try {
      const info = api.info(await (await http(api.detailUrl(site, row.id))).json())
      if (info?.body) details.set(row.id, info)
    } catch (err) {
      if (isThrottled(err)) {
        throttled = true
        break
      }
    }
  }
  return { details, throttled }
}
