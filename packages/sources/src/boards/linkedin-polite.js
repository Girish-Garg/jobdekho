// LinkedIn tells a client to slow down with 429, or with its own 999. Either
// one ends the whole LinkedIn run at once, search and descriptions alike: no
// retry, no waiting it out, no other header or identity to get round it.
// What was already collected is kept. http.js throws on any non-2xx with the
// status first in the message, which is where the code is read from.
const REFUSED = /^HTTP (429|999)\b/

// Any status at all means the request reached LinkedIn. A network error or
// a timeout did not, and a run in which nothing did (a computer offline)
// read nothing, which the scrape's guard needs to know.
const ANSWERED = /^HTTP \d{3}\b/

// The same refusal in another form: a redirect that lands a guest on a
// sign-in page. The guest endpoints have never been seen to do it, but a run
// that followed one would spend its whole budget on the wall.
const SIGN_IN = /linkedin\.com\/(authwall|checkpoint|login|uas\/login)/

// `retryAfterMs` is how long LinkedIn asked to be left alone, or null when
// it did not say; the guard never pauses for less.
export class Refused extends Error {
  constructor(reason, retryAfterMs = null) {
    super(reason)
    this.retryAfterMs = retryAfterMs
  }
}

export function refusalOf(err) {
  const code = String(err?.message || '').match(REFUSED)?.[1]
  return code ? `HTTP ${code}` : null
}

// A Retry-After header is either whole seconds or an HTTP date (RFC 9110
// allows both). Anything else reads as nothing said.
export function retryAfterMs(value, now = Date.now()) {
  const text = String(value ?? '').trim()
  if (/^\d+$/.test(text)) return Number(text) * 1000
  const at = /[a-z]/i.test(text) ? Date.parse(text) : NaN
  return Number.isNaN(at) ? null : Math.max(0, at - now)
}

// 2 to 4 seconds between any two requests, jittered so a run does not
// arrive on a fixed beat. The 36 requests that measured this adapter were 3
// to 6 seconds apart and none was refused; this sits just under that, and a
// daily sweep of 60 requests takes two to four minutes, spent while the
// other sources run alongside.
export const GAP_MS = 2000
export const JITTER_MS = 2000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// One of these per run, shared by the search sweep and the description
// fetches, so the pause holds across both and a refusal in either stops both.
// get.answered() counts the requests LinkedIn answered, refusals included.
// `wait`, `random` and `now` are for tests, which must never actually sleep.
export function politeGet(http, { wait = sleep, random = Math.random, now = Date.now } = {}) {
  let sent = 0
  let answered = 0
  async function get(url) {
    if (sent++ > 0) await wait(GAP_MS + Math.floor(random() * JITTER_MS))
    let res
    try {
      res = await http(url, { headers: { Accept: 'text/html' } })
    } catch (err) {
      if (ANSWERED.test(String(err?.message || ''))) answered += 1
      const why = refusalOf(err)
      throw why ? new Refused(why, retryAfterMs(err.retryAfter, now())) : err
    }
    answered += 1
    if (SIGN_IN.test(res.url || '')) throw new Refused('a redirect to sign in')
    return res.text()
  }
  get.answered = () => answered
  return get
}
