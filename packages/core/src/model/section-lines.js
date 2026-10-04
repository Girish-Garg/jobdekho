import { units } from './tokens.js'
import { headingLine } from '../jd-layout.js'

// The lines the section model sorts, in order, a list item starting "- ",
// with what the heading over each one says of it:
//
//   { lines, under }   under[i]: 'nice' | 'must' | null
//
// A body the model sorts has no heading the rules lay it out by, but it
// can still have headings: known ones run into a flattened line ("...
// Nice to have: - Rust"), left out of the lines, and ones the rules do not
// know ("Ways to stand out from the crowd:"), kept as lines. The model
// reads a line alone, and a nice-to-have reads like a requirement: only
// the heading over it tells them apart. In the postings the first version
// sorted, at least 13 of about 240 requirement placements sat under a
// nice-to-have heading the rules did not know.
const NICE_HEAD = /nice[-\u2011 ]to[-\u2011 ](?:have|know)|good[-\u2011 ]to[-\u2011 ]have|bonus|\bplus\b|prefer|desirable|desired\b(?! (?:candidate|profile|experience))|advantage|optional|\bextras?\b|stand out|sets? you apart|(?:may|might|could) also have|would be (?:great|nice)|even better/i
const MUST_HEAD = /\bmust\b|\brequired\b|requirements?|mandatory|essential|\bneed\b|this is you|you (?:have|are|bring)\b|you(?:['’]ll| will) (?:have|bring|need)|looking for|qualifications?|skills|experience|competenc|eligib|criteria|what it takes/i
// A heading of another kind ends the one above it.
const OTHER_HEAD = /^(?:about\b|our\b|why\b|who we are|life at|join\b|benefits|perks|what we offer|we offer|how to apply|location|responsibilit|duties|what you(?:['’]ll| will)? (?:be )?do|the role|your role|role\b|day[- ]to[- ]day|in this role)/i

// What a heading the rules do not know says: undefined when it says
// nothing about the lines under it ("Strong understanding of:").
function meaning(text) {
  if (NICE_HEAD.test(text)) return 'nice'
  if (MUST_HEAD.test(text)) return 'must'
  return OTHER_HEAD.test(text) ? null : undefined
}

// Company suffixes end a heading with a stop ("About Micron Technology,
// Inc.") without making it a sentence.
const SUFFIX = /,?\s*\b(?:inc|ltd|llc|corp|co|pvt|plc)\.?$/i
const SMALL = /^(?:and|or|of|the|a|an|to|for|in|at|with|&|on|by)$/i

// A line shaped like a heading rather than a sentence or a list item: a
// short one ending in a colon or a question mark, or a few words with no
// stop, opening "About", "Our" and the like or in title case.
export function headingShaped(line) {
  if (/^- /.test(line)) return false
  const text = line.trim()
  const words = text.split(/\s+/)
  if (/[:?]$/.test(text)) return words.length <= 10
  const bare = text.replace(SUFFIX, '')
  if (words.length > 6 || /[.!;,]$/.test(bare)) return false
  if (/^(?:about|our|why|what|who|how|life at|join)\b/i.test(bare)) return true
  return bare.split(/\s+/).filter((w) => !SMALL.test(w)).every((w) => /^[A-Z0-9(]/.test(w))
}

export function sortableUnits(text) {
  const lines = []
  const under = []
  let context = null
  for (const unit of units(text)) {
    const head = headingLine(unit.text)
    if (head && head.kind !== 'other') {
      context = head.kind === 'nice' ? 'nice' : head.kind === 'requirements' ? 'must' : null
      continue
    }
    const line = unit.bullet ? `- ${unit.text}` : unit.text
    if (head || headingShaped(line)) {
      const said = meaning(unit.text)
      if (said !== undefined) context = said
    }
    lines.push(line)
    under.push(context)
  }
  return { lines, under }
}
