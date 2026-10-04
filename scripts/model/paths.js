import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

// Where the maintainer's model work lives in the repo:
//   weights   shipped with core, read by core's model/weights.js
//   metrics   what training measured, tracked, the model card's source
//   audits    the owner's finished reviews, tracked, also in the card
//   review    samples, pre-checks and verdicts being worked on; holds posting
//             text, so it sits under a data/ folder git ignores
//   card      docs/model-card.md
export const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const WEIGHTS_DIR = join(ROOT, 'packages', 'core', 'src', 'model', 'weights')
export const METRICS_DIR = join(ROOT, 'scripts', 'model', 'metrics')
export const REVIEW_DIR = join(ROOT, 'scripts', 'model', 'data', 'review')
export const CARD = join(ROOT, 'docs', 'model-card.md')

export const weightsPath = (name) => join(WEIGHTS_DIR, `${name}.json`)
export const metricsPath = (name) => join(METRICS_DIR, `${name}.json`)
export const auditPath = (name) => join(METRICS_DIR, `audit-${name}.json`)
export const reviewDir = (name) => join(REVIEW_DIR, name)
