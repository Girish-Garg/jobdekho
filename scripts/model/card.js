import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { readAudits } from '@jobdekho/core/model/audit.js'
import { CARD, metricsPath } from './paths.js'
import { levelCard } from './card-level.js'
import { sectionsCard } from './card-sections.js'

const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null)

// An audit counts only for the version it checked: a retrained model is
// not yet audited until the owner reviews it again.
const auditFor = (name, version) => {
  const record = readAudits()[name]
  return record?.version === version ? record : null
}

const INTRO = `# Model card

JobDekho has two small word models. They run on the person's own computer in plain JavaScript, and only where the step 1 rules found no evidence. The maintainer trains them with \`npm run train:model\` (scripts/model), which writes the weights, the measurements in scripts/model/metrics, and this card. The numbers below are generated; edit scripts/model/card*.js, not this file.

## How a claim is proved

- Held out: every model is tested on companies it never saw, and its thresholds are set for about 99.5% precision there, so that the owner's check passes reliably.
- The owner's check: \`npm run review:model -- sections\` opens a local page with 250 of the model's real outputs, drawn once and kept, spread across companies (\`--draw-only\` draws them and leaves). Each shows the posting, the output, the words that pushed it, and Claude's pre-check when there is one. The owner marks each right or wrong.
- The claim is 98% precision with 95% confidence: 0 wrong in 150 checked, or at most 1 in 236. When a review is finished, its record goes into packages/core/src/model/audit.json with its one-sided 95% Clopper-Pearson lower bound, and is written below.
- A shipped model's output shows in the app only once that record is for its very version and passed; until then the model is off, and the card reads "not yet audited".
- Pre-checks are read from scripts/model/data/review/<model>/precheck.json: \`{ "<sample id>": { "verdict": "right" | "wrong" | "unsure", "note": "why" } }\`, empty until filled.
`

export function cardText() {
  const parts = [INTRO]
  const level = readJson(metricsPath('level'))
  const sections = readJson(metricsPath('sections'))
  if (sections) parts.push(sectionsCard(sections, auditFor('sections', sections.version)))
  if (level) parts.push(levelCard(level, auditFor('level', level.version)))
  return parts.join('\n')
}

export function writeCard() {
  writeFileSync(CARD, cardText())
}
