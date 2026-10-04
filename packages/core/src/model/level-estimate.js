import { levelFeatures, textWords } from './level-features.js'
import { probabilities, pushes } from './linear.js'
import { levelEvidence } from './level-evidence.js'
import { shippedModel } from './weights.js'

// A level the small model estimates for a posting whose own words never
// state one, always as a range of two adjacent levels: a word model is
// right about the exact level far too rarely to show one (84 to 90% on
// companies it never saw), and about a pair of neighbours far more often.
//
//   { range: [lo, hi], confidence, version, evidence, words } or null
//
// null unless the pair's probability clears that pair's threshold, which
// was set on postings from companies the model never saw so that about
// 995 in 1000 shown ranges hold the level the rules would have found. A
// pair that never got there has no threshold and is never shown.
export const pairName = (classes, lo) => `${classes[lo]}-${classes[lo + 1]}`

// The adjacent pair holding the most probability: { lo, confidence }.
export function bestPair(p) {
  let best = { lo: 0, confidence: -1 }
  for (let lo = 0; lo + 1 < p.length; lo++) {
    const confidence = p[lo] + p[lo + 1]
    if (confidence > best.confidence) best = { lo, confidence }
  }
  return best
}

// What the model makes of a posting, shown or not, for the training
// scripts and the review page: { lo, confidence, threshold, features }.
export function scoreLevel(posting, model) {
  const features = levelFeatures(posting)
  const { lo, confidence } = bestPair(probabilities(model, features))
  return { lo, confidence, threshold: model.thresholds[pairName(model.classes, lo)] ?? null, features }
}

const textOf = (posting) => posting.description ?? posting.descriptionText ?? ''

export function estimateLevel(posting = {}, model = shippedModel('level')) {
  if (!model) return null
  const description = textOf(posting)
  if (textWords(description) < model.minWords) return null
  const { lo, confidence, threshold, features } = scoreLevel({ ...posting, description }, model)
  if (threshold == null || confidence < threshold) return null
  const { evidence, words } = levelEvidence(pushes(model, features, [lo, lo + 1]))
  return {
    range: [model.classes[lo], model.classes[lo + 1]],
    confidence: Math.floor(confidence * 1000) / 1000,
    version: model.version,
    evidence,
    words,
  }
}
