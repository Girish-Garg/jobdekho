import { logoUrl } from '@jobdekho/core/logo.js'
import { sniffType, declaredNotRaster } from './sniff.js'

const TIMEOUT_MS = 8000
// Logos are 75 to 150 pixels square; anything past this is not one.
export const MAX_BYTES = 300 * 1024

// One logo, from one of the hosts core/logo.js allows. Redirects are refused
// rather than followed, since a redirect could lead off that list. The type
// served is the one the bytes show (see sniff.js), never the declared one,
// and only raster images pass: an SVG served from this computer's own
// address could carry script. Resolves to { type, body } or null, never
// throws.
export async function fetchLogo(url, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  if (!logoUrl(url)) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'image/*' } })
    if (res.status !== 200) return null
    if (declaredNotRaster(String(res.headers.get('content-type') || ''))) return null
    if (Number(res.headers.get('content-length') || 0) > MAX_BYTES) return null
    const body = Buffer.from(await res.arrayBuffer())
    const type = body.length <= MAX_BYTES ? sniffType(body) : null
    return type ? { type, body } : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
