import { factFeatures } from './fact-features.js'
import { probabilities, pushes } from './linear.js'
import { shippedModel } from './weights.js'

// Which fact, if any, each line of a description states, for the facts
// the plain readers did not find (see model-facts.js): a pre-placement
// offer, shifts or working hours, an early start, an address to send the
// resume to. A line counts only when its likeliest fact clears that
// fact's threshold, set on postings from companies the model never saw;
// a fact with no threshold is never shown.
//
// `lines` are the description's lines as description-facts.js cuts them.

// Every line's best guess, shown or not: { kind, confidence, shown, words }.
// The review page shows the guess beside what a reader would see.
export function scoreFactLines(lines, model = shippedModel('facts')) {
  if (!model) return lines.map(() => ({ kind: 'none', confidence: 0, shown: null, words: [] }))
  return lines.map((line) => {
    const features = factFeatures(line)
    const p = probabilities(model, features)
    const c = p.indexOf(Math.max(...p))
    const kind = model.classes[c]
    const threshold = model.thresholds[kind]
    const shown = kind !== 'none' && threshold != null && p[c] >= threshold ? kind : null
    const words = shown ? pushes(model, features, [c]).filter(({ name }) => name.startsWith('w:')).slice(0, 3).map(({ name }) => name.slice(2)) : []
    return { kind, confidence: Math.floor(p[c] * 1000) / 1000, shown, words }
  })
}

// The lines shown for each fact, most confident first:
// { [kind]: [{ line, confidence, words }] }.
export function factLines(lines, model = shippedModel('facts')) {
  const found = {}
  scoreFactLines(lines, model).forEach((s, i) => {
    if (s.shown) (found[s.shown] ??= []).push({ line: lines[i], confidence: s.confidence, words: s.words })
  })
  for (const list of Object.values(found)) list.sort((a, b) => b.confidence - a.confidence)
  return found
}
