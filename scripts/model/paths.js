import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

// Where the maintainer's model work lives in the repo:
//   weights    shipped with core, read by core's model/weights.js
//   unshipped  weights of a model the package does not ship, kept only
//              for study; under a data/ folder git ignores, since training
//              writes them again
//   metrics    what training measured, tracked, the model card's source
//   review     samples, pre-checks and verdicts being worked on; holds
//              posting text, so it also sits under an ignored data/ folder
//   card       docs/model-card.md
// The owner's finished audits are shipped with core (model/audit.json),
// since they decide what the app shows.
export const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const WEIGHTS_DIR = join(ROOT, 'packages', 'core', 'src', 'model', 'weights')
export const UNSHIPPED_DIR = join(ROOT, 'scripts', 'model', 'data', 'unshipped')
export const METRICS_DIR = join(ROOT, 'scripts', 'model', 'metrics')
export const REVIEW_DIR = join(ROOT, 'scripts', 'model', 'data', 'review')
export const CARD = join(ROOT, 'docs', 'model-card.md')

export const weightsPath = (name, shipped = true) => join(shipped ? WEIGHTS_DIR : UNSHIPPED_DIR, `${name}.json`)
export const metricsPath = (name) => join(METRICS_DIR, `${name}.json`)
export const reviewDir = (name) => join(REVIEW_DIR, name)
