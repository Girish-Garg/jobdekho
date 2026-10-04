import { MODEL_VERSIONS } from '@jobdekho/core/model/version.js'
import { decodeModel } from '@jobdekho/core/model/weights.js'
import { SECTION_KINDS, sectionExamples } from './section-data.js'
import { outOfFold, fitTrained } from './cross-validate.js'
import { fitTemperature } from './calibrate.js'
import { scoreHeldOut, sectionReport, unheadedReport } from './section-report.js'
import { compactModel } from './compact.js'
import { SEED, FOLDS } from './random.js'

// Lines are many and short, so fewer passes are enough. Words in fewer than
// five lines are left out, which keeps the weights near 1.5 MB: at three
// they grew to 2.5 MB for half a point more coverage.
export const SECTION_SPEC = {
  name: 'sections', version: MODEL_VERSIONS.sections, classes: SECTION_KINDS, minCount: 5, cut: 0.02,
  hp: { epochs: 8, rate: 0.2, l2: 1e-5, seed: SEED },
}
const OPTIONS = { minSupport: 50 }

// Trains the section model on lines whose heading said their section,
// measures it on companies it never saw, and returns { weights, metrics }.
export function trainSections(postings, files) {
  const examples = sectionExamples(postings)
  const oof = outOfFold(examples, SECTION_SPEC)
  const temperature = fitTemperature(oof, examples.map((e) => e.y))
  const items = scoreHeldOut(examples, oof, temperature)
  const report = sectionReport(items, OPTIONS)
  const { vocab, W, typical } = fitTrained(examples, SECTION_SPEC)
  const weights = compactModel({ name: 'sections', version: SECTION_SPEC.version, classes: SECTION_KINDS, vocab, W, typical, temperature, thresholds: report.chosen.thresholds }, { cut: SECTION_SPEC.cut })
  const counts = Object.fromEntries(SECTION_KINDS.map((kind, c) => [kind, examples.filter((e) => e.y === c).length]))
  const metrics = {
    model: 'sections',
    version: SECTION_SPEC.version,
    data: {
      files,
      postings: postings.length,
      headedPostings: new Set(examples.map((e) => e.id)).size,
      trainedOn: examples.length,
      companies: new Set(examples.map((e) => e.companyKey)).size,
      lines: counts,
    },
    split: { by: 'company', folds: FOLDS, seed: SEED },
    training: { ...SECTION_SPEC.hp, minCount: SECTION_SPEC.minCount, pruneBelow: SECTION_SPEC.cut, vocabulary: vocab.size, kept: weights.features.length },
    temperature: weights.temperature,
    minSupport: OPTIONS.minSupport,
    ...report,
    unheaded: unheadedReport(postings, decodeModel(weights)),
  }
  return { weights, metrics }
}
