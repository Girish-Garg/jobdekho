import { ruleFor as defaultRule } from './host-rules.js'

// Many sources share one host: 55 Greenhouse boards are one API, and about a
// hundred Workday tenants sit on a handful of data centres. The run fetches 8
// sources at once, so without this all 8 could be talking to one host
// together, and a block on that host would take every source on it down. So
// each host gets one queue, shared by every adapter in the run: a few requests
// in flight and a gap between two starts (host-rules.js says how many).
const WORKDAY = /^[a-z0-9-]+\.(wd\d+)\.myworkdayjobs\.com$/i

// Workday tenants are different hostnames on one data centre, and a block
// would land on the data centre, so they queue together.
export function hostKey(url) {
  let host
  try {
    host = new URL(String(url)).hostname.toLowerCase()
  } catch {
    return ''
  }
  const centre = host.match(WORKDAY)?.[1]
  return centre ? `workday:${centre.toLowerCase()}` : host
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// "HTTP 429" first, as the host itself would have said it: the adapters that
// stop on a 429 (Workday, the portals, LinkedIn) read the status from there.
function refusal(url) {
  return new Error(`HTTP 429 for ${url} (not sent: this host refused earlier in the run)`)
}

// enter(url) waits for a turn and resolves with leave(status), which must be
// called once the answer (or the failure) is in. A host that answered 429 is
// left alone for the rest of the run: whatever else was queued for it, and
// anything asked later, fails at once without being sent.
export function createHostGate({ ruleFor = defaultRule, now = Date.now, wait = sleep } = {}) {
  const lanes = new Map()
  const laneOf = (key) => {
    if (!lanes.has(key)) lanes.set(key, { rule: ruleFor(key), active: 0, nextStart: 0, queue: [], refused: false })
    return lanes.get(key)
  }

  async function enter(url) {
    const lane = laneOf(hostKey(url))
    while (!lane.refused && lane.active >= lane.rule.inFlight) await new Promise((resolve) => lane.queue.push(resolve))
    if (lane.refused) throw refusal(url)
    lane.active += 1
    const start = Math.max(now(), lane.nextStart)
    lane.nextStart = start + lane.rule.gapMs
    if (start > now()) await wait(start - now())
    let left = false
    return function leave(status) {
      if (left) return
      left = true
      lane.active -= 1
      if (status === 429) lane.refused = true
      if (lane.refused) lane.queue.splice(0).forEach((resolve) => resolve())
      else lane.queue.shift()?.()
    }
  }

  return { enter, refused: (url) => laneOf(hostKey(url)).refused }
}
