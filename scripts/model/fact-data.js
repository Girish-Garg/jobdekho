import { linesOf } from '@jobdekho/core/description-facts.js'
import { factFeatures } from '@jobdekho/core/model/fact-features.js'
import { factLines } from '@jobdekho/core/model/fact-estimate.js'
import { FACT_VALUES } from '@jobdekho/core/fact-values.js'
import { foldOf, seeded, shuffled, SEED } from './random.js'
import { fingerprint, isCandidate, readLabels, readWritten } from './fact-lines.js'
import { readArchive } from './fact-archive.js'

export { CANDIDATE, fingerprint, isCandidate, readLabels, readWritten } from './fact-lines.js'

// What the facts model learns from. Nothing in a posting labels these
// facts, so they were read by hand: every line a candidate word picks out
// (fact-lines.js) was labelled with the fact it states, or none, the label
// kept in labels/facts.json under the line's fingerprint and the line in
// the archive (fact-archive.js), which keeps it after the app deletes its
// posting. Lines no candidate word picks out are taken as stating none of
// them, a sample of PLAIN of them from the corpus as it is now.
// labels/facts-written.json adds sentences written by hand for wordings the
// corpus has too few of; they are trained on and never measured
// (train-facts.js).
//
// Openings and bonds were stated in too few lines to learn (2 and 0), so
// they stay the plain readers' alone; their lines count as none here.
export const FACT_KINDS = ['ppo', 'shift', 'start', 'email', 'none']
const PLAIN = 8000

function example(text, label, companyKey) {
  const kind = FACT_KINDS.includes(label) ? label : 'none'
  return { text, companyKey, fold: foldOf(companyKey), y: FACT_KINDS.indexOf(kind), features: factFeatures(text) }
}

// { examples, unlabelled, gone }: every labelled line the archive keeps,
// under the company it was first seen at, whether or not its posting is
// still in the corpus; the corpus's plain lines, a seeded sample, as none;
// the written examples, marked `written`. `unlabelled` are the archive's
// candidate lines no label covers yet, for the next pass of hand reading;
// `gone` counts the labelled lines whose posting the app has deleted.
export function factExamples(postings, { labels = readLabels(), written = readWritten(), archive = readArchive() } = {}) {
  const examples = []
  const unlabelled = []
  for (const entry of archive.values()) {
    if (labels[entry.fp]) examples.push(example(entry.text, labels[entry.fp], entry.companyKey))
    else if (isCandidate(entry.text)) unlabelled.push({ line: entry.text, company: entry.company, source: entry.source })
  }
  const present = new Set()
  const plain = []
  for (const p of postings) {
    for (const line of linesOf(p.description)) {
      const key = fingerprint(line)
      if (present.has(key)) continue
      present.add(key)
      // A line the archive keeps is labelled, or waits for its label.
      if (line.length < 8 || line.length > 600 || archive.has(key) || labels[key] || isCandidate(line)) continue
      plain.push({ line, companyKey: p.companyKey })
    }
  }
  for (const p of shuffled(plain, seeded(SEED)).slice(0, PLAIN)) examples.push(example(p.line, 'none', p.companyKey))
  for (const [text, label] of written) examples.push({ ...example(text, label, 'written'), written: true })
  const gone = [...archive.values()].filter((entry) => labels[entry.fp] && !present.has(entry.fp)).length
  return { examples, unlabelled, gone }
}

// The lines a trained model would show in the app that no one has read
// yet, any line of any posting: a held-out measure only covers the lines
// that were labelled, and a word the model leans on too hard ("Permanent"
// alone, as a job type) shows up here first. Read and labelled, they are
// the next round's training. [{ line, kind, value, confidence, company }]
export function unreviewedShown(postings, model, { labels = readLabels() } = {}) {
  const out = new Map()
  for (const p of postings) {
    for (const [kind, picked] of Object.entries(factLines(linesOf(p.description), model))) {
      for (const { line, confidence } of picked) {
        const key = fingerprint(line)
        const fact = FACT_VALUES[kind]?.(line)
        if (labels[key] || out.has(key) || !fact) continue
        out.set(key, { line, kind, value: fact.value, confidence, company: p.company })
      }
    }
  }
  return [...out.values()]
}
