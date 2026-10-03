import { createHash } from 'node:crypto'
import { companyPattern } from './company-words.js'

// A key for an ad's text with its own company's name taken out, so one ad
// posted under several names keys alike: the stipend mills found in the
// study ran one "Data Analyst Intern" ad under five names, each saying
// "<Name> is offering a structured career launch". Exact rather than a
// near-duplicate hash: on the stored corpus the two found the same one
// group, and exact costs one hash a posting instead of a pairwise pass.
//
// Short texts share too much by chance ("External Job Description"), so
// below this many words there is no key.
export const AD_KEY_MIN_WORDS = 40

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function adKey(description, company) {
  let text = String(description || '')
  const name = String(company || '').trim()
  if (name) text = text.replace(new RegExp(esc(name), 'gi'), ' ')
  const own = companyPattern(name)
  if (own) text = text.replace(own, ' ')
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  if (words.split(' ').length < AD_KEY_MIN_WORDS) return null
  return createHash('sha1').update(words).digest('hex').slice(0, 16)
}
