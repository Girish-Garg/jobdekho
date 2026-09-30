import { createHttp } from '@jobdekho/sources/http.js'
import { createHostGate } from '@jobdekho/sources/host-gate.js'
import { createRobotsCheck } from '@jobdekho/sources/robots/robots-check.js'
import { isChallenge } from '@jobdekho/sources/challenge.js'

// How the seed asks: one request at a time per host, three seconds apart; only
// where robots.txt allows; and never past a block. A host that answers 429 is
// left alone for the rest of the run (host-gate.js), and a challenge page
// (Cloudflare's "Just a moment...", an AWS WAF check) counts as a no.
const GAP_MS = 3000

export function politeHttp({ fetchImpl = fetch, gapMs = GAP_MS } = {}) {
  const http = createHttp({ fetchImpl, gate: createHostGate({ ruleFor: () => ({ inFlight: 1, gapMs }) }) })
  const allowed = createRobotsCheck(http)

  // For the providers' own adapters: the same http, behind robots.txt.
  async function guarded(url, options) {
    if (!(await allowed(url))) throw new Error(`robots.txt disallows ${url}`)
    return http(url, options)
  }

  // A page, or why not: { ok, url, text } or { ok: false, why }.
  async function page(url) {
    if (!(await allowed(url))) return { ok: false, why: 'robots.txt disallows it' }
    try {
      const res = await http(url, { anyStatus: true, headers: { Accept: 'text/html' } })
      const text = await res.text()
      if (isChallenge(res, text)) return { ok: false, why: `blocked (HTTP ${res.status})` }
      if (res.status !== 200) return { ok: false, why: `HTTP ${res.status}` }
      return { ok: true, url: res.url || url, text }
    } catch (err) {
      return { ok: false, why: String(err?.message ?? err).slice(0, 120) }
    }
  }

  return { guarded, page }
}
