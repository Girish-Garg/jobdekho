import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { factCheckResume } from './resume-fact-check.js'
import { jdText } from './resume-tailor-prompt.js'
import { bulletText, entryText, skillText } from './resume-tailor-shown.js'
import { readBullets } from './resume-tailor-bullets.js'
import { readLeftOut } from './resume-tailor-left-out.js'

// One chosen entry from the model's plan, held against the actual profile
// entry it claims to be. An id the profile does not have is worth nothing -
// the model cannot invent an employer by inventing an id - so it is dropped
// here rather than trusted. Title and organisation are copied from the real
// entry, never from the model's reply, purely so the saved plan can name what
// it picked without a second lookup. Its bullets come back with the person's
// own beside them (see resume-tailor-bullets.js).
function validateEntry(raw, byId) {
  const id = typeof raw?.id === 'string' ? raw.id : ''
  const original = byId.get(id)
  if (!original) return null
  const read = readBullets(raw, original)
  if (!read.bullets.length) return null
  return { id, ...read, title: original.title, organisation: original.organisation }
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
// rather than from anything the model claimed about its own plan, and keeps
// of what it wants left out only what the record and the posting allow (see
// resume-tailor-left-out.js). Null when nothing survived validation at all,
// which the caller reports as unreadable.
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
  return { sections, leftOut: readLeftOut(raw, profile, sections, jd), flags, coverage }
}
