import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { linesOf } from '@jobdekho/core/description-facts.js'
import { factLines } from '@jobdekho/core/model/fact-estimate.js'
import { ROOT } from './paths.js'
import { fingerprint, isCandidate } from './fact-lines.js'

// The lines the facts model is labelled on, kept as text for good. The app
// deletes a posting once it closes, or two months after it was posted or
// last listed (core's freshness.js, the store's corpus-prune.js), and a
// label is kept only by its line's fingerprint (labels/facts.json): read
// from the corpus alone, every label would lose its line within two months,
// and each retraining would learn from less than the last.
//
// So every candidate line a corpus holds, every line the weights would show
// and every labelled line can be copied here as it is seen, and never taken
// out, for training to read its labelled lines from whatever the corpus
// still holds. It is one file on the maintainer's computer: git ignores it
// (scripts/model/data), since it holds posting text, recruiters' addresses
// included. Off for now: training reads the corpus alone (fact-data.js
// corpusLines says why, and train-facts.js how to turn it back on).
//
//   { fp, text, company, companyKey, source, seen: 'YYYY-MM-DD' } per line
export const ARCHIVE = join(ROOT, 'scripts', 'model', 'data', 'facts', 'lines.ndjson')

// fp to entry. A torn last line, from a write cut short, is skipped.
export function readArchive(file = ARCHIVE) {
  const kept = new Map()
  if (!existsSync(file)) return kept
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    if (!raw.trim()) continue
    try {
      const entry = JSON.parse(raw)
      if (entry?.fp && !kept.has(entry.fp)) kept.set(entry.fp, entry)
    } catch {
      // skipped
    }
  }
  return kept
}

// Adds the lines of these postings worth keeping that the archive does not
// hold yet: candidates (`isCandidate`), lines with a label, and with a
// model, lines it would show. Appended, so nothing already kept is ever
// rewritten. { added, total }.
export function keepLines(postings, { labels = {}, model = null, file = ARCHIVE, now = new Date() } = {}) {
  const kept = readArchive(file)
  const seen = now.toISOString().slice(0, 10)
  const fresh = []
  for (const p of postings) {
    const lines = linesOf(p.description)
    const shown = new Set(model ? Object.values(factLines(lines, model)).flat().map((s) => s.line) : [])
    for (const line of lines) {
      const fp = fingerprint(line)
      if (kept.has(fp) || line.length > 600 || !(isCandidate(line) || labels[fp] || shown.has(line))) continue
      const entry = { fp, text: line, company: p.company, companyKey: p.companyKey, source: p.source, seen }
      kept.set(fp, entry)
      fresh.push(entry)
    }
  }
  if (fresh.length) {
    mkdirSync(dirname(file), { recursive: true })
    appendFileSync(file, fresh.map((entry) => `${JSON.stringify(entry)}\n`).join(''))
  }
  return { added: fresh.length, total: kept.size }
}
