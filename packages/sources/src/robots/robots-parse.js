// robots.txt as RFC 9309 reads it: the group naming this crawler's product
// token, else the "*" group; within it the longest matching path wins, and an
// Allow wins a tie; "*" matches any run of characters and a trailing "$"
// anchors the end. A path is matched with its query string, which is how
// Internshala's "Disallow: /*?*" keeps every search page out.
export const PRODUCT = 'jobdekho'

export function parseRobots(text) {
  const groups = []
  let current = null
  let lastWasAgent = false
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()
    if (key === 'user-agent') {
      if (!lastWasAgent) groups.push((current = { agents: [], rules: [] }))
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (current && (key === 'allow' || key === 'disallow') && value) current.rules.push({ allow: key === 'allow', path: value })
  }
  return groups
}

function matcher(path) {
  const anchored = path.endsWith('$')
  const body = (anchored ? path.slice(0, -1) : path).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

export function allowedBy(groups, path, product = PRODUCT) {
  const named = groups.filter((g) => g.agents.some((agent) => agent !== '*' && product.includes(agent)))
  const chosen = named.length ? named : groups.filter((g) => g.agents.includes('*'))
  let best = null
  for (const rule of chosen.flatMap((g) => g.rules)) {
    if (!matcher(rule.path).test(path)) continue
    const longer = !best || rule.path.length > best.path.length
    if (longer || (rule.path.length === best.path.length && rule.allow)) best = rule
  }
  return best ? best.allow : true
}
