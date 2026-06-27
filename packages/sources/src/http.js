const DEFAULT_TIMEOUT = 15000
const DEFAULT_UA = 'JobDekhoBot/1.0 (+personal internship tracker)'

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
