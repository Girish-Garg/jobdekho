import { lineFeatures } from './section-features.js'
import { probabilities, pushes } from './linear.js'
import { shippedModel } from './weights.js'

// Which section each line of a description belongs to, for a posting whose
// text has no heading to say so: duties, requirements, pay, about or
// other. A line goes to its likeliest section only when that probability
// clears the section's threshold, set on postings from companies the model
// never saw; every other line stays "other", in the posting's own order.
//
// `lines` are the description's lines in order, a list item starting "- ".

// Every line's best guess, shown or not: { kind, confidence, shown, words }.
// The review page shows the guess beside what a reader would see.
export function scoreLines(lines, model = shippedModel('sections')) {
  if (!model) return lines.map(() => ({ kind: 'other', confidence: 0, shown: 'other', words: [] }))
  return lines.map((_, i) => {
    const features = lineFeatures(lines, i)
    const p = probabilities(model, features)
    const c = p.indexOf(Math.max(...p))
    const kind = model.classes[c]
    const threshold = model.thresholds[kind]
    const shown = threshold != null && p[c] >= threshold ? kind : 'other'
    const words = pushes(model, features, [c]).filter(({ name }) => name.startsWith('w:')).slice(0, 3).map(({ name }) => name.slice(2))
    return { kind, confidence: Math.floor(p[c] * 1000) / 1000, shown, words }
  })
}

export function estimateSections(lines, model = shippedModel('sections')) {
  return scoreLines(lines, model).map((line) => line.shown)
}
