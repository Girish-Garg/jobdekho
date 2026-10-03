import { boilerplateIndex } from '@jobdekho/core/boilerplate.js'
import { jdSentences } from '@jobdekho/core/jd-sentences.js'
import { companyKey } from '@jobdekho/core/company-key.js'

// Sentences a company repeats across its own postings are its template: the
// about-us, the benefits list, the closing paragraph. The job pane folds
// them under "Show company text" (see core's jd-layout.js) and never drops
// them. Read once per company per loaded corpus, as other corpus-wide
// readings are (fit-inputs.js).
const caches = new WeakMap()

function indexFor(rows, company) {
  if (!caches.has(rows)) caches.set(rows, new Map())
  const cache = caches.get(rows)
  const key = companyKey(company)
  if (!cache.has(key)) cache.set(key, boilerplateIndex(rows.filter((row) => companyKey(row.company) === key)))
  return cache.get(key)
}

// Whether a line is wholly this company's template text.
export function templateOf(rows, company) {
  const index = indexFor(rows, company)
  return (line) => {
    const sentences = jdSentences(line)
    return sentences.length > 0 && sentences.every(index.isBoilerplate)
  }
}
