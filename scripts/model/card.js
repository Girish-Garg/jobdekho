import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { CARD, metricsPath, auditPath } from './paths.js'
import { levelCard } from './card-level.js'
import { sectionsCard } from './card-sections.js'

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null)

// An audit counts only for the version it checked: a retrained model is
// not yet audited until the owner reviews it again.
const auditFor = (name, version) => {
  const record = readJson(auditPath(name))
  return record && record.version === version ? record : null
}

const INTRO = `# Model card

JobDekho ships two small word models in packages/core/src/model/weights. They run on the person's own computer in plain JavaScript, and only where the step 1 rules found no evidence. They are trained by the maintainer with \`npm run train:model\` (scripts/model), which writes the weights, the measurements in scripts/model/metrics, and this card. The numbers below are generated; edit scripts/model/card*.js, not this file.

## How a claim is proved

- Held out: every model is tested on companies it never saw, and its thresholds are set for about 99.5% precision there, so that the owner's check passes reliably.
- The owner's check: \`npm run review:model -- level\` (or \`sections\`) opens a local page with 250 of the model's real outputs, drawn once and kept, spread across companies. Each shows the posting, the output, the words that pushed it, and Claude's pre-check when there is one. The owner marks each right or wrong.
- The claim is 98% precision with 95% confidence: 0 wrong in 150 checked, or at most 1 in 236. When a review is finished, its one-sided 95% Clopper-Pearson lower bound is written below; until then a model reads "not yet audited".
- Pre-checks are read from scripts/model/data/review/<model>/precheck.json: \`{ "<sample id>": { "verdict": "right" | "wrong" | "unsure", "note": "why" } }\`, empty until filled.
`

export function cardText() {
  const parts = [INTRO]
  const level = readJson(metricsPath('level'))
  const sections = readJson(metricsPath('sections'))
  if (level) parts.push(levelCard(level, auditFor('level', level.version)))
  if (sections) parts.push(sectionsCard(sections, auditFor('sections', sections.version)))
  return parts.join('\n')
}

export function writeCard() {
  writeFileSync(CARD, cardText())
}
