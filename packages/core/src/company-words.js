// The distinctive words of a company's name ("Supabase", "PhonePe"), for the
// two places a posting talks about its own company: the opening pitch, which
// is company copy, and the company's own product names, which are not a
// requirement ("MongoDB Atlas" in a MongoDB ad). Generic words ("Tech",
// "Solutions") would blank half of any ad, so they are left out.
const NOISE = new Set(['the', 'tech', 'technologies', 'technology', 'global', 'india', 'private', 'limited', 'pvt', 'ltd',
  'group', 'solutions', 'services', 'labs', 'software', 'systems', 'digital', 'consulting', 'infotech', 'inc', 'llc',
  'corp', 'company', 'foundation', 'enterprises', 'international'])

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A case-insensitive pattern for those words, or null when the name has none.
export function companyPattern(company) {
  const words = String(company || '').toLowerCase().split(/[^a-z0-9.+#]+/)
    .filter((w) => w.length >= 4 && !NOISE.has(w))
  return words.length ? new RegExp(`\\b(?:${words.map(esc).join('|')})\\b`, 'gi') : null
}
