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

export function createHttp({ fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT, userAgent = DEFAULT_UA } = {}) {
  return async function http(url, options = {}) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url, {
        ...options,
        signal: controller.signal,
        headers: { 'User-Agent': userAgent, Accept: 'application/json', ...(options.headers || {}) },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${redactUrl(url)}`)
      return res
    } finally {
      clearTimeout(timer)
    }
  }
}
