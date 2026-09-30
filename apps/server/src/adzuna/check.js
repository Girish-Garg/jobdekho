import { searchUrl } from '@jobdekho/sources/boards/adzuna-url.js'

// Settings' "Check key": ONE search for a single Indian listing, the same
// endpoint the scrape calls (see adzuna-url.js), so a key that passes here
// is one the next refresh can use, at the cost of one of the free tier's
// requests. The answer is { ok, problem?, message }: `problem` is
// 'rejected', 'limit', 'adzuna' or 'network', and `message` a sentence for
// the card. No error text from the attempt is ever passed on or logged: the
// request's URL carries the key, and a network error may quote it.
const TIMEOUT_MS = 15000

const problem = (name, message) => ({ ok: false, problem: name, message })

const OK = { ok: true, message: 'Adzuna accepted this key.' }
const REJECTED = problem('rejected', 'Adzuna did not accept this app id and key. Check both were copied whole from developer.adzuna.com.')
const LIMIT = problem('limit', 'Adzuna knows this key, but it has used up its free requests for now. Try again later.')
const NETWORK = problem('network', 'Could not reach Adzuna. Check this computer is online, then try again.')
const ODD = problem('adzuna', 'Adzuna answered, but not with job listings. Try again in a while.')
const failed = (status) => problem('adzuna', `Adzuna answered with an error (HTTP ${status}). Try again in a while.`)

// A bad key is expected back as a 401 with an AUTH_FAIL body. Adzuna's pages
// do not say which status it uses, so a 403, or any error whose body names
// AUTH, reads the same rather than as Adzuna being down.
const refused = (res, body) =>
  !res.ok && (res.status === 401 || res.status === 403 || /AUTH/i.test(String(body?.exception ?? '')))

export async function checkAdzunaKeys({ appId, appKey }, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  let res
  try {
    res = await fetchImpl(searchUrl({ country: 'in', page: 1, perPage: 1, appId, appKey }), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    return NETWORK
  }
  const body = await res.json().catch(() => null)
  if (refused(res, body)) return REJECTED
  if (res.status === 429) return LIMIT
  if (!res.ok) return failed(res.status)
  return Array.isArray(body?.results) ? OK : ODD
}
