// LinkedIn tells a client to slow down with 429, or with its own 999. Either
// one ends the whole LinkedIn run at once, search and descriptions alike: no
// retry, no waiting it out, no other header or identity to get round it.
// What was already collected is kept. http.js throws on any non-2xx with the
// status first in the message, which is where the code is read from.
const REFUSED = /^HTTP (429|999)\b/

// The same refusal in another form: a redirect that lands a guest on a
// sign-in page. The guest endpoints have never been seen to do it, but a run
// that followed one would spend its whole budget on the wall.
const SIGN_IN = /linkedin\.com\/(authwall|checkpoint|login|uas\/login)/

export class Refused extends Error {}

export function refusalOf(err) {
  const code = String(err?.message || '').match(REFUSED)?.[1]
  return code ? `HTTP ${code}` : null
}

// 1.5 to 2.5 seconds between any two requests, jittered so a run does not
// arrive on a fixed beat. The 36 requests that measured this adapter were 3
// to 6 seconds apart and none was refused; a full run at this pace has not
// been tried live. A run is about 100 requests, so the pause is most of its
// four or five minutes, spent while the other sources run alongside.
export const GAP_MS = 1500
export const JITTER_MS = 1000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// One of these per run, shared by the search sweep and the description
// fetches, so the pause holds across both and a refusal in either stops both.
// `wait` and `random` are for tests, which must never actually sleep.
export function politeGet(http, { wait = sleep, random = Math.random } = {}) {
  let sent = 0
  return async function get(url) {
    if (sent++ > 0) await wait(GAP_MS + Math.floor(random() * JITTER_MS))
    let res
    try {
      res = await http(url, { headers: { Accept: 'text/html' } })
    } catch (err) {
      const why = refusalOf(err)
      throw why ? new Refused(why) : err
    }
    if (SIGN_IN.test(res.url || '')) throw new Refused('a redirect to sign in')
    return res.text()
  }
}
