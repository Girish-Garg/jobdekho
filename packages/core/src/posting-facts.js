import { sectionize } from './jd-sections.js'
import { yearsAsked, yearsIn } from './years-asked.js'
import { payLabel } from './pay-label.js'
import { quote } from './tag.js'

// The facts a description states, for the line above its sections, each
// with where it came from and the words that said it:
//
//   years     { min, max, from: 'text' | 'board', evidence } | null
//   pay       { value, label, currency, monthly, from: 'board' | 'text', evidence } | null
//   workMode  { value, from, evidence } | null
//
// Years are read the way the fit reads them (years-asked.js): the highest
// floor among the requirement lines, never a founding date.
function yearsFact(row) {
  const units = sectionize(row.descriptionText || '', row.company)
  const asked = yearsAsked({ title: row.title || '', company: row.company || '', units, experienceYears: row.experienceYears ?? null })
  if (!asked.band || asked.from === 'title') return null
  const [min] = asked.band
  if (asked.from === 'board') return { min, max: null, from: 'board', evidence: `Experience field: ${row.experience}` }
  // The top is the stated range's own: one assumed for "5+ years", or taken
  // from another line, is not what this line asks.
  const ranged = /\d\s*(?:-|to|\u2013|\u2014)\s*\d/.test(asked.words)
  const max = ranged ? yearsIn(asked.words)?.[1] ?? null : null
  return { min, max: max !== min ? max : null, from: 'text', evidence: `Says "${quote(asked.words, 120)}"` }
}

function payFact(row) {
  const tag = row.payTag
  if (!tag) return null
  return {
    value: row.stipend,
    label: payLabel(row.stipend, row.currency ?? undefined),
    currency: row.currency ?? null,
    monthly: row.stipendMin ?? null,
    from: tag.from,
    evidence: tag.evidence,
  }
}

const workModeFact = (row) => (row.workModeTag ? { value: row.workModeTag.value, from: row.workModeTag.from, evidence: row.workModeTag.evidence } : null)

export function postingFacts(row) {
  return { years: yearsFact(row), pay: payFact(row), workMode: workModeFact(row) }
}
