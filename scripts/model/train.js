import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { loadPostings, defaultFiles } from './postings.js'
import { trainLevel } from './train-level.js'
import { trainSections } from './train-sections.js'
import { writeCard } from './card.js'
import { METRICS_DIR, weightsPath, metricsPath } from './paths.js'

// Trains the small models, for the maintainer only:
//
//   npm run train:model -- [sections|level] [postings.ndjson ...]
//
// With no model named it trains the ones the package ships; with no file
// named it reads the corpus the app keeps on this machine. A shipped model
// writes its weights into core; one kept for study only, as the level
// model is since no unknown posting reached its bar, into an ignored folder.
// Each writes its measurements into scripts/model/metrics (not shipped),
// and the model card is written again from those. The same files give the
// same weights: every split, shuffle and start is seeded.
const MODELS = { level: trainLevel, sections: trainSections }
const SHIPPED = new Set(['sections'])

const args = process.argv.slice(2)
const names = args.filter((arg) => MODELS[arg])
const paths = args.filter((arg) => !MODELS[arg])
const { postings, files } = loadPostings(paths.length ? paths : defaultFiles())
console.log(`${postings.length} distinct postings from ${files.map((f) => `${f.file} (${f.rows} rows, ${f.date})`).join(', ')}`)

mkdirSync(METRICS_DIR, { recursive: true })
for (const name of names.length ? names : [...SHIPPED]) {
  const started = Date.now()
  const { weights, metrics } = MODELS[name](postings, files)
  const text = JSON.stringify(weights)
  const file = weightsPath(name, SHIPPED.has(name))
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
  writeFileSync(metricsPath(name), `${JSON.stringify({ ...metrics, shipped: SHIPPED.has(name), weightsBytes: Buffer.byteLength(text) }, null, 2)}\n`)
  console.log(`${name}: ${weights.features.length} features kept, ${(Buffer.byteLength(text) / 1024).toFixed(0)} KB, ${SHIPPED.has(name) ? 'shipped' : 'not shipped'}, ${((Date.now() - started) / 1000).toFixed(0)} s`)
}
writeCard()
