import { parseRobots, allowedBy } from './robots-parse.js'
import { isChallenge } from '../challenge.js'

// Whether a URL may be fetched, by its host's robots.txt, read once per host
// per run. RFC 9309: a robots.txt the server calls unavailable (any 4xx)
// allows everything, and one it fails to give (a 5xx, no answer) means stay
// out. Ashby's API host answers its robots.txt with a plain 401 (2026-10-01):
// there is none, and so no rule against its public posting API.
// Two 4xx answers are still a no: a 429, since a host asking JobDekho to slow
// down is left alone, and a bot challenge, which Remotive answered its
// robots.txt with on 2026-09-30 and which is never something to work past.
export function createRobotsCheck(http) {
  const byOrigin = new Map()

  async function groupsFor(origin) {
    try {
      const res = await http(`${origin}/robots.txt`, { anyStatus: true, headers: { Accept: 'text/plain' } })
      const text = await res.text()
      if (res.status >= 200 && res.status < 300) return parseRobots(text)
      if (res.status < 400 || res.status >= 500 || res.status === 429) return null
      return isChallenge(res, text) ? null : []
    } catch {
      return null
    }
  }

  // Resolves true when the host's rules allow the URL's path and query.
  return async function allowed(url) {
    let target
    try {
      target = new URL(url)
    } catch {
      return false
    }
    if (!byOrigin.has(target.origin)) byOrigin.set(target.origin, groupsFor(target.origin))
    const groups = await byOrigin.get(target.origin)
    return groups ? allowedBy(groups, `${target.pathname}${target.search}`) : false
  }
}
