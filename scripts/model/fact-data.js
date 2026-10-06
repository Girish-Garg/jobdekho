import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { linesOf } from '@jobdekho/core/description-facts.js'
import { factFeatures } from '@jobdekho/core/model/fact-features.js'
import { factLines } from '@jobdekho/core/model/fact-estimate.js'
import { FACT_VALUES } from '@jobdekho/core/fact-values.js'
import { foldOf, seeded, shuffled, SEED } from './random.js'

// What the facts model learns from. Nothing in a posting labels these
// facts, so they were read by hand: every line of the maintainer's corpus
// a candidate word picks out (CANDIDATE below) was labelled with the fact
// it states, or none, and its label kept in labels/facts.json under the
// line's fingerprint, never its text, so no recruiter's address ends up in
// the repo. Lines no candidate word picks out are taken as stating none of
// them, a sample of PLAIN of them. labels/facts-written.json adds
// sentences written by hand for wordings the corpus has too few of; they
// are trained on and never measured (train-facts.js).
//
// Openings and bonds were stated in too few lines to learn (2 and 0), so
// they stay the plain readers' alone; their lines count as none here.
export const FACT_KINDS = ['ppo', 'shift', 'start', 'email', 'none']
const PLAIN = 8000

export const CANDIDATE = [
  /\b(?:ppo|pre[- ]?placement|full[- ]?time\b.*\b(?:intern|internship|trainee|after|based on|performance|completion|opportunit|potential|chance|offer|convert|transition|absorb|considered|extend)|(?:intern|internship|trainee|after|based on|performance|completion|opportunit|potential|chance|offer|convert|transition|absorb|considered|extend)\b.*\bfull[- ]?time|permanent (?:role|position|employment|job|opportunit)|convert(?:ed|ion)?|absorb(?:ed|tion)?\b.*\b(?:role|employee|team|company)|job offer|offer letter|returning offer|return offer|\bfte\b)/i,
  /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/i,
  /\b(?:openings?|vacanc(?:y|ies)|positions?|seats|hiring for|headcount)\b.*\b\d{1,3}\b|\b\d{1,3}\b.*\b(?:openings?|vacanc(?:y|ies)|positions?|seats)\b|^number of openings/i,
  /\b(?:bond|service agreement|lock[- ]?in|commit(?:ment)? (?:to|of|for) (?:a )?(?:minimum|\d)|minimum (?:tenure|service|commitment|period)|serve (?:the company|a minimum|for)|training cost|liquidated damages|surety)\b/i,
  /\b(?:immediate(?:ly)?|joiners?|joining|start date|starting date|notice period|asap|available to (?:start|join)|join (?:us )?(?:within|by|in|from)|start (?:within|by|from|on|in))\b/i,
  /\b(?:shifts?|night|nights|rotational|rotating|graveyard|24x7|24\/7|time ?zones?|overlap|(?:US|UK|EU|European|American) (?:hours|time|business hours)|\d{1,2}(?::\d{2})?\s*(?:am|pm)\b.{0,15}\b\d{1,2}(?::\d{2})?\s*(?:am|pm))\b|\b(?:EST|PST|CST|GMT|BST|CET|IST)\b/i,
]
export const isCandidate = (line) => CANDIDATE.some((pattern) => pattern.test(line))

export const fingerprint = (line) => createHash('sha256').update(line.toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 16)

const readJson = (name) => JSON.parse(readFileSync(new URL(`./labels/${name}`, import.meta.url), 'utf8'))
export const readLabels = () => readJson('facts.json')
export const readWritten = () => readJson('facts-written.json').examples

function example(text, label, companyKey) {
  const kind = FACT_KINDS.includes(label) ? label : 'none'
  return { text, companyKey, fold: foldOf(companyKey), y: FACT_KINDS.indexOf(kind), features: factFeatures(text) }
}

// { examples, unlabelled }: each distinct line once, under the company it
// was first seen at; `unlabelled` the candidate lines no label covers yet,
// for the next pass of hand reading. Written examples carry `written`.
export function factExamples(postings, { labels = readLabels(), written = readWritten() } = {}) {
  const examples = []
  const plain = []
  const unlabelled = []
  const seen = new Set()
  for (const p of postings) {
    for (const line of linesOf(p.description)) {
      const key = fingerprint(line)
      if (line.length > 600 || seen.has(key)) continue
      seen.add(key)
      if (!isCandidate(line)) {
        if (line.length >= 8) plain.push({ line, companyKey: p.companyKey })
      } else if (labels[key]) {
        examples.push(example(line, labels[key], p.companyKey))
      } else {
        unlabelled.push({ line, company: p.company, source: p.source })
      }
    }
  }
  for (const p of shuffled(plain, seeded(SEED)).slice(0, PLAIN)) examples.push(example(p.line, 'none', p.companyKey))
  for (const [text, label] of written) examples.push({ ...example(text, label, 'written'), written: true })
  return { examples, unlabelled }
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
