import { mkdirSync, writeFileSync } from 'node:fs'
import { loadPostings, defaultFiles } from './postings.js'
import { trainLevel } from './train-level.js'
import { trainSections } from './train-sections.js'
import { writeCard } from './card.js'
import { WEIGHTS_DIR, METRICS_DIR, weightsPath, metricsPath } from './paths.js'

// Trains the small models the package ships, for the maintainer only:
//
//   npm run train:model -- [level|sections] [postings.ndjson ...]
//
// With no model named it trains both; with no file named it reads the
// corpus the app keeps on this machine. Each model writes its weights into
// core (shipped) and its measurements into scripts/model/metrics (not
// shipped), and the model card is written again from those. The same
// files give the same weights: every split, shuffle and start is seeded.
const MODELS = { level: trainLevel, sections: trainSections }

const args = process.argv.slice(2)
const names = args.filter((arg) => MODELS[arg])
const paths = args.filter((arg) => !MODELS[arg])
const { postings, files } = loadPostings(paths.length ? paths : defaultFiles())
console.log(`${postings.length} distinct postings from ${files.map((f) => `${f.file} (${f.rows} rows, ${f.date})`).join(', ')}`)

mkdirSync(WEIGHTS_DIR, { recursive: true })
mkdirSync(METRICS_DIR, { recursive: true })
for (const name of names.length ? names : Object.keys(MODELS)) {
  const started = Date.now()
  const { weights, metrics } = MODELS[name](postings, files)
  const text = JSON.stringify(weights)
  writeFileSync(weightsPath(name), text)
  writeFileSync(metricsPath(name), `${JSON.stringify({ ...metrics, weightsBytes: Buffer.byteLength(text) }, null, 2)}\n`)
  console.log(`${name}: ${weights.features.length} features kept, ${(Buffer.byteLength(text) / 1024).toFixed(0)} KB, ${((Date.now() - started) / 1000).toFixed(0)} s`)
}
writeCard()
