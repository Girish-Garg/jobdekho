import { COMMON_WORDS } from './common-words.js'
import { companyKey, words } from '@jobdekho/core/company-key.js'

// The key itself lives in core, where the feed's company filter uses it too;
// the chat's own question is which companies a question names.
export { companyKey }

// Two-letter keys ("ey", "xm") match too much of ordinary text to be trusted.
const MIN_KEY = 3

// A question rarely names more than a couple of employers; past three, the
// prompt would be mostly rows nobody asked about.
const MAX_NAMED = 3

// The companies of `companies` the question names as whole words, one per
// key, the longest keys first so "Amazon Web Services" beats "Amazon".
export function companiesNamed(question, companies) {
  const asked = ` ${words(question).join(' ')} `
  const found = new Map()
  for (const name of companies) {
    const key = companyKey(name)
    if (key.length < MIN_KEY || COMMON_WORDS.has(key) || found.has(key) || !asked.includes(` ${key} `)) continue
    found.set(key, name)
  }
  return [...found].sort(([a], [b]) => b.length - a.length).slice(0, MAX_NAMED).map(([key, name]) => ({ key, name }))
}
