import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { MODEL_VERSIONS } from '@jobdekho/core/model/version.js'
import { logits, softmax } from '@jobdekho/core/model/linear.js'
import { FACT_VALUES } from '@jobdekho/core/fact-values.js'
import { decodeModel } from '@jobdekho/core/model/weights.js'
import { FACT_KINDS, factExamples, unreviewedShown } from './fact-data.js'
import { fitShipped, fitTrained } from './cross-validate.js'
import { fitTemperature } from './calibrate.js'
import { factReport } from './fact-report.js'
import { compactModel } from './compact.js'
import { reviewDir } from './paths.js'
import { SEED, FOLDS } from './random.js'

// Of the word counts tried (2, 3, 5 and 8 lines at least), 5 held up best
// on companies the model never saw, at 200 KB: rarer words only helped it
// remember the lines it trained on. The lines are few, so more passes are
// cheap. A threshold needs only 15 lines covered to be set: the owner's
// review, not this, is what proves the model (see core's model/audit.js).
export const FACT_SPEC = {
  name: 'facts', version: MODEL_VERSIONS.facts, classes: FACT_KINDS, minCount: 5, cut: 0.02,
  hp: { epochs: 25, rate: 0.2, l2: 1e-4, seed: SEED },
}
const OPTIONS = { minSupport: 15 }

// Out of fold, by company, with the written examples in every fold's
// training and none of its testing: they teach wordings, and grading the
// model on its own teaching would flatter it.
function heldOut(examples) {
  const corpus = examples.filter((e) => !e.written)
  const written = examples.filter((e) => e.written)
  const scores = new Map()
  for (let k = 0; k < FOLDS; k++) {
    const model = fitShipped([...corpus.filter((e) => e.fold !== k), ...written], FACT_SPEC)
    for (const e of corpus) if (e.fold === k) scores.set(e, logits(model, e.features))
  }
  return { corpus, scores: corpus.map((e) => scores.get(e)) }
}

const countOf = (list) => Object.fromEntries(FACT_KINDS.map((kind, c) => [kind, list.filter((e) => e.y === c).length]))

// Trains the facts model on the hand-read lines, measures it on companies
// it never saw, and returns { weights, metrics }. What is measured is what
// the app would show: a line counts for its fact only when its words give
// a value (core's fact-values.js), as in the pane. For the next pass of
// hand reading, scripts/model/data/review/facts/ gets unlabelled.json, the
// candidate lines no label covers yet, and unreviewed.json, the lines the
// new weights would show that no one has read.
export function trainFacts(postings, files) {
  const { examples, unlabelled } = factExamples(postings)
  const { corpus, scores } = heldOut(examples)
  const temperature = fitTemperature(scores, corpus.map((e) => e.y))
  const items = corpus.map((e, i) => {
    const p = softmax(scores[i], temperature)
    const c = p.indexOf(Math.max(...p))
    const group = FACT_KINDS[c] !== 'none' && FACT_VALUES[FACT_KINDS[c]](e.text) ? FACT_KINDS[c] : 'none'
    return { group, confidence: p[c], right: group === FACT_KINDS[e.y], fold: e.fold, truth: FACT_KINDS[e.y], text: e.text }
  })
  const report = factReport(items, OPTIONS)
  const { vocab, W, typical } = fitTrained(examples, FACT_SPEC)
  const weights = compactModel({ name: 'facts', version: FACT_SPEC.version, classes: FACT_KINDS, vocab, W, typical, temperature, thresholds: report.chosen.thresholds }, { cut: FACT_SPEC.cut })
  const unreviewed = unreviewedShown(postings, decodeModel(weights))
  mkdirSync(reviewDir('facts'), { recursive: true })
  writeFileSync(join(reviewDir('facts'), 'unlabelled.json'), `${JSON.stringify(unlabelled, null, 2)}\n`)
  writeFileSync(join(reviewDir('facts'), 'unreviewed.json'), `${JSON.stringify(unreviewed, null, 2)}\n`)
  const metrics = {
    model: 'facts',
    version: FACT_SPEC.version,
    data: {
      files,
      postings: postings.length,
      companies: new Set(corpus.map((e) => e.companyKey)).size,
      lines: countOf(corpus),
      written: countOf(examples.filter((e) => e.written)),
      unlabelled: unlabelled.length,
      unreviewedShown: unreviewed.length,
    },
    split: { by: 'company', folds: FOLDS, seed: SEED },
    training: { ...FACT_SPEC.hp, minCount: FACT_SPEC.minCount, pruneBelow: FACT_SPEC.cut, vocabulary: vocab.size, kept: weights.features.length },
    temperature: weights.temperature,
    minSupport: OPTIONS.minSupport,
    ...report,
  }
  return { weights, metrics }
}
