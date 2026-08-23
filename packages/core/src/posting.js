import { createHash } from 'node:crypto'

export function makeId(source, externalId) {
  return createHash('sha1').update(`${source}:${externalId}`).digest('hex').slice(0, 16)
}

// One role advertised across several cities arrives as several postings. They
// are genuinely different jobs, so they are not deduplicated, but this lets the
// grid collapse them into one card that says how many locations there are.
export function makeGroupKey(title, company) {
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
  return `${norm(title)}|${norm(company)}`
}
