import { quote } from '../tag.js'
import { FACT_VALUES } from '../fact-values.js'
import { auditPassed } from './audit.js'
import { factLines } from './fact-estimate.js'

// What the facts model reads in a description's lines, ungated:
// { [kind]: { value, personal?, from: 'model', evidence, confidence, line,
// words } }, the last three for the review page only.
// For each fact, the most confident line whose words give a value (see
// fact-values.js); a line the model picked that says nothing usable
// ("General shift") gives way to the next. The review page reads this
// before any audit, since the audit is of what it shows.
export function modelFacts(lines, model) {
  const out = {}
  for (const [kind, picked] of Object.entries(factLines(lines, model))) {
    const read = FACT_VALUES[kind]
    if (!read) continue
    for (const { line, confidence, words } of picked) {
      const fact = read(line)
      if (!fact) continue
      out[kind] = { ...fact, from: 'model', evidence: `Says "${quote(line, 120)}" (read by JobDekho's model)`, confidence, line, words }
      break
    }
  }
  return out
}

// The facts the plain readers found, with the model's added where they
// found none, once the owner's audit of the model's version has passed
// (audit.js). A fact the rules found is never replaced: words that state
// it in so many words are the better evidence.
export function withModelFacts(ruled, lines, { model, audits }) {
  if (!auditPassed(audits, model)) return ruled
  const added = Object.entries(modelFacts(lines, model)).filter(([kind]) => !ruled[kind])
  return { ...ruled, ...Object.fromEntries(added.map(([kind, { confidence, line, words, ...fact }]) => [kind, fact])) }
}
