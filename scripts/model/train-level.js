import { LEVELS } from '@jobdekho/core/level.js'
import { MODEL_VERSIONS } from '@jobdekho/core/model/version.js'
import { levelExamples, MIN_WORDS } from './level-data.js'
import { outOfFold, fitTrained } from './cross-validate.js'
import { fitTemperature } from './calibrate.js'
import { scoreKnown, scoreUnknown } from './level-score.js'
import { levelReport } from './level-report.js'
import { asShipped, compactModel } from './compact.js'
import { SEED, FOLDS } from './random.js'

// Of the L2 penalties tried (1e-6 to 3e-3), 3e-4 kept the most held-out
// postings above 99.5% precision: weaker ones gave sharper scores that were
// wrong more often at the top, stronger ones flattened the scores. A word
// in fewer than ten postings did not help on companies the model never
// saw, and leaving those out took the weights from 8.6 MB to about 1 MB.
export const LEVEL_SPEC = {
  name: 'level', version: MODEL_VERSIONS.level, classes: LEVELS, minCount: 10, cut: 0.03,
  hp: { epochs: 15, rate: 0.2, l2: 3e-4, seed: SEED },
}
const OPTIONS = { minSupport: 50 }

const countBy = (list, key) => Object.fromEntries(Object.entries(list.reduce((m, x) => ({ ...m, [key(x)]: (m[key(x)] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]))

// Trains the level model on the postings step 1 placed, measures it on
// companies it never saw, and returns { weights, metrics } to be written.
export function trainLevel(postings, files) {
  const { known, unknown } = levelExamples(postings)
  const oof = outOfFold(known, LEVEL_SPEC)
  const temperature = fitTemperature(oof, known.map((e) => e.y))
  const items = scoreKnown(known, oof, temperature)
  const { vocab, W, typical } = fitTrained(known, LEVEL_SPEC)
  const draft = { name: 'level', version: LEVEL_SPEC.version, classes: LEVELS, vocab, W, typical, temperature, minWords: MIN_WORDS }
  const unknownItems = scoreUnknown(unknown, asShipped(draft, { cut: LEVEL_SPEC.cut }), new Set(known.map((e) => e.companyKey)))
  const report = levelReport({ items, unknownItems, unknownTotal: unknown.length, options: OPTIONS })
  const weights = compactModel({ ...draft, thresholds: report.chosen.thresholds }, { cut: LEVEL_SPEC.cut })
  const metrics = {
    model: 'level',
    version: LEVEL_SPEC.version,
    data: {
      files,
      postings: postings.length,
      trainedOn: known.length,
      companies: new Set(known.map((e) => e.companyKey)).size,
      levels: countBy(known, (e) => LEVELS[e.y]),
      levelFrom: countBy(known, (e) => e.from),
      unknown: unknown.length,
      unknownWithText: unknownItems.length,
    },
    split: { by: 'company', folds: FOLDS, seed: SEED },
    training: { ...LEVEL_SPEC.hp, minCount: LEVEL_SPEC.minCount, pruneBelow: LEVEL_SPEC.cut, minWords: MIN_WORDS, vocabulary: vocab.size, kept: weights.features.length },
    temperature: weights.temperature,
    minSupport: OPTIONS.minSupport,
    ...report,
  }
  return { weights, metrics }
}
