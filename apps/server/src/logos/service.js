import { openStore } from '@jobdekho/store/open.js'
import { readLogo, writeLogo, missedRecently, writeMiss } from './cache.js'
import { fetchLogo } from './fetch.js'

// A posting's logo as bytes: from this computer's cache, or fetched once from
// the address the scrape stored and cached for good. Only the stored address
// is ever fetched, never one a request names, so this is no open proxy. A row
// of postings from one company asks for the same file at once, so a fetch in
// flight is shared rather than repeated.
export function createLogoService({ store = null, fetchImpl = fetch, now = Date.now } = {}) {
  let handle = store
  const db = () => (handle ??= openStore())
  const inFlight = new Map()

  async function load(url) {
    const cached = readLogo(db(), url)
    if (cached) return cached
    if (missedRecently(db(), url, now())) return null
    const got = await fetchLogo(url, { fetchImpl })
    if (got) writeLogo(db(), url, got)
    else writeMiss(db(), url, now())
    return got
  }

  return {
    async forPosting(id) {
      const url = db().corpus.byId().get(id)?.logoUrl
      if (!url) return null
      if (!inFlight.has(url)) inFlight.set(url, load(url).finally(() => inFlight.delete(url)))
      return inFlight.get(url)
    },
  }
}
