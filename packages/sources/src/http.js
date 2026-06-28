const DEFAULT_TIMEOUT = 15000
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

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
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return res
    } finally {
      clearTimeout(timer)
    }
  }
}
