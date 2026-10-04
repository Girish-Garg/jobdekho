import { estimateLevel } from './level-estimate.js'
import { LEVEL_MODEL_VERSION } from './version.js'
import { shippedModel } from './weights.js'

// The fields the level model adds to a posting (see tagging.js):
//
//   levelEstimate   { range: [lo, hi], confidence, from: 'model', version,
//                     evidence, words } or null
//   modelVersion    the level model's version this posting was estimated by
//
// Only a posting whose level nothing stated is estimated: the board's
// field, the title or the text always win, and the estimate never fills
// the plain `level` the filters read. modelVersion is set either way, so a
// newer model can tell which postings it has not looked at yet.
export function levelEstimateFields({ title = '', company = '', description = '' } = {}, levelTag = null, model = shippedModel('level')) {
  const estimate = levelTag ? null : estimateLevel({ title, company, description }, model)
  return {
    levelEstimate: estimate ? { range: estimate.range, confidence: estimate.confidence, from: 'model', version: estimate.version, evidence: estimate.evidence, words: estimate.words } : null,
    modelVersion: LEVEL_MODEL_VERSION,
  }
}
