// Every tag a posting shows says where it came from and why, so its hover
// can say so and a wrong one can be traced to the rule that made it:
//
//   { value, from: 'board' | 'title' | 'text', evidence, version }
//
// `evidence` is the matched words or field ("Title says Senior", "Asks for 3
// to 5 years"). Bump TAGS_VERSION whenever a rule changes what it decides:
// stored postings carrying an older version are tagged again, once, from the
// text they kept (see the store's corpus.js).
export const TAGS_VERSION = 3

export const tag = (value, from, evidence) => ({ value, from, evidence, version: TAGS_VERSION })

// Quoted words read better on a hover than a bare fragment, and a long match
// is cut at a word so the hover stays one line.
export function quote(words, max = 80) {
  const flat = String(words || '').replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  return `${flat.slice(0, max).replace(/\s+\S*$/, '')}...`
}
