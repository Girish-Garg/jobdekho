const DEFAULT_TIMEOUT = 15000
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Adzuna (and any future keyed API) puts its credentials in the query string,
// and that URL ends up in a thrown error, then in runs.source_results, then in
// the GitHub Actions log. Redacting here covers every adapter, not just the
// one that happened to get caught leaking.
const PARAM_RE = /([?&])([^=&]+)=([^&]*)/g

// The sensitive word has to sit on a separator or an end of the parameter name.
// A plain \b does not: "_" is a word character, so \btoken never matched
// access_token, and the two commonest secret spellings both leaked. Anchoring
// this way also leaves "keywords" alone, which a bare substring test would
// redact for containing "key".
const SENSITIVE_NAME_RE =
  /(^|[_-])(app_?key|app_?id|api_?key|access_?token|client_?secret|key|token|secret|password|passwd|auth|credentials?)([_-]|$)/i

export function redactUrl(url) {
  return String(url).replace(PARAM_RE, (match, sep, name) =>
    (SENSITIVE_NAME_RE.test(name) ? `${sep}${name}=REDACTED` : match))
}

// fetch's own errors can quote the URL too ("Failed to parse URL from ..."),
// so they get the same redaction. Only an error that needed it is replaced,
// and with a plain one carrying no cause: the original still holds the key.
// The rest pass through untouched, an abort's DOMException included.
function redactedError(err) {
  const message = String(err?.message ?? '')
  const safe = redactUrl(message)
  return safe === message ? err : new Error(safe)
}

// A site that is asking to be left alone may say for how long in a
// Retry-After header, and the response is gone once this throws, so the
// header travels on the error for whoever wants it (LinkedIn's guard does).
function statusError(res, url) {
  const err = new Error(`HTTP ${res.status} for ${redactUrl(url)}`)
  const retryAfter = res.headers?.get?.('retry-after')
  if (retryAfter) err.retryAfter = retryAfter
  return err
}

// A 304 is the answer a conditional request asked for (see conditional.js),
// not a failure. `anyStatus` hands back every answer as it came, for a caller
// that reads the status itself (the closed-posting check reads 404s and
// redirects).
const passes = (res, init, anyStatus) =>
  res.ok || anyStatus || (res.status === 304 && Boolean(init.headers?.['If-None-Match']))

// `gate` (host-gate.js) is the run's per-host queue. The timer starts once
// the gate lets a request go, so time spent queueing is not counted as the
// host being slow.
export function createHttp({ fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT, userAgent = DEFAULT_UA, gate = null } = {}) {
  return async function http(url, options = {}) {
    const { anyStatus = false, ...init } = options
    const controller = new AbortController()
    let leave = null
    let timer = null
    try {
      leave = gate ? await gate.enter(url) : null
      timer = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetchImpl(url, {
        ...init,
        signal: controller.signal,
        headers: { 'User-Agent': userAgent, Accept: 'application/json', ...(init.headers || {}) },
      })
      leave?.(res.status)
      if (!passes(res, init, anyStatus)) throw statusError(res, url)
      return res
    } catch (err) {
      leave?.(0)
      throw redactedError(err)
    } finally {
      clearTimeout(timer)
    }
  }
}
