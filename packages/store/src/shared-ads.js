import { companyKey } from '@jobdekho/core/company-key.js'
import { sharedAdFlag } from '@jobdekho/core/caution.js'
import { isCareerSite } from '@jobdekho/core/source-kind.js'

// One ad under three or more company names is a red flag no single posting
// can show: the stipend mills found in the study ran one "Data Analyst
// Intern" ad under five. Two names is still an agency and its client.
export const SHARED_AD_NAMES = 3

// The names each ad key was posted under, worked out once per loaded corpus
// and kept for as long as it is the same array (see corpus.js), the way the
// fit's inputs are (fit-inputs.js).
const indexes = new WeakMap()

function namesByKey(rows) {
  if (!indexes.has(rows)) {
    const byKey = new Map()
    for (const row of rows) {
      if (!row.adKey) continue
      if (!byKey.has(row.adKey)) byKey.set(row.adKey, new Map())
      byKey.get(row.adKey).set(companyKey(row.company), row.company)
    }
    indexes.set(rows, byKey)
  }
  return indexes.get(rows)
}

// A posting's red flags: its own, stored with its tags, and the one only the
// whole corpus shows. A company's own careers site is never flagged.
export function cautionFor(row, corpusRows = []) {
  const own = row.caution ?? []
  if (!row.adKey || isCareerSite(row.source)) return own
  const names = namesByKey(corpusRows).get(row.adKey)
  return names && names.size >= SHARED_AD_NAMES ? [...own, sharedAdFlag([...names.values()])] : own
}
