import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { factCheckResume } from './resume-fact-check.js'
import { jdText } from './resume-tailor-prompt.js'
import { bulletText, entryText, skillText } from './resume-tailor-shown.js'

const MAX_BULLETS = 20
const MAX_BULLET = 400
const MAX_DROPPED = 20

const strings = (value, max, maxLen) => (Array.isArray(value) ? value : [])
  .slice(0, max)
  .map((v) => (typeof v === 'string' ? v.trim().slice(0, maxLen) : ''))
  .filter(Boolean)

// One chosen entry from the model's plan, held against the actual profile
// entry it claims to be. An id the profile does not have is worth nothing -
// the model cannot invent an employer by inventing an id - so it is dropped
// here rather than trusted. Title and organisation are copied from the real
// entry, never from the model's reply, purely so the saved plan can name what
// it picked without a second lookup.
function validateEntry(raw, byId) {
  const id = typeof raw?.id === 'string' ? raw.id : ''
  const original = byId.get(id)
  if (!original) return null
  const bullets = strings(raw.bullets, MAX_BULLETS, MAX_BULLET)
  if (!bullets.length) return null
  return {
    id, bullets, dropped: strings(raw.dropped, MAX_DROPPED, MAX_BULLET),
    title: original.title, organisation: original.organisation,
  }
}

function validateSection(raw, entries) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]))
  return (Array.isArray(raw) ? raw : []).map((entry) => validateEntry(entry, byId)).filter(Boolean)
}

// Rule 1 held in code, entry by entry: a reworded bullet is checked against
// the ONE entry it claims to reword, using the same fact check the flat
// rewrite used (see resume-fact-check.js), never against the record as a
// whole - so a number that is honest in one job cannot cover for an invented
// one in another.
function entryFlags(entry, original, jd, keywords) {
  const { factCheck } = factCheckResume({
    original: entryText(original), tailored: bulletText(entry.bullets), jd, keywords,
  })
  return factCheck.flags
}

// Drops any id the profile does not have, checks every kept bullet against
// its own entry's originals, and reports coverage from one whole-record pass
// rather than from anything the model claimed about its own plan. Null when
// nothing survived validation at all, which the caller reports as unreadable.
export function validatePlan(raw, profile, posting, keywords) {
  const jd = jdText(posting)
  const sections = {}
  const flags = []
  const originalLines = []
  const tailoredLines = []
  for (const key of ENTRY_SECTIONS) {
    const entries = profile[key] ?? []
    const byId = new Map(entries.map((entry) => [entry.id, entry]))
    sections[key] = validateSection(raw?.sections?.[key], entries)
    for (const entry of sections[key]) {
      const original = byId.get(entry.id)
      flags.push(...entryFlags(entry, original, jd, keywords))
      originalLines.push(entryText(original))
      tailoredLines.push(bulletText(entry.bullets))
    }
  }
  if (!ENTRY_SECTIONS.some((key) => sections[key].length > 0)) return null
  const shown = [...originalLines, skillText(profile)].filter(Boolean).join('\n')
  const { coverage } = factCheckResume({ original: shown, tailored: tailoredLines.join('\n'), jd, keywords })
  return { sections, flags, coverage }
}
