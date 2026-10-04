import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { auditResult } from './stats.js'
import { auditPath } from '../paths.js'
import { writeCard } from '../card.js'

// The finished review of this version, if there is one.
export function savedAudit(model, version) {
  if (!existsSync(auditPath(model))) return null
  const record = JSON.parse(readFileSync(auditPath(model), 'utf8'))
  return record.version === version ? record : null
}

// Where a review stands: how many are checked, right and wrong, and the
// first sample not yet checked, which is where the page resumes.
export function progress(samples, verdicts) {
  const checked = samples.filter((s) => verdicts[s.id])
  const wrong = checked.filter((s) => verdicts[s.id].verdict === 'wrong').length
  const next = samples.findIndex((s) => !verdicts[s.id])
  return { total: samples.length, checked: checked.length, right: checked.length - wrong, wrong, resumeAt: next < 0 ? 0 : next, done: samples.length > 0 && next < 0 }
}

// A finished review: its exact one-sided 95% lower bound, kept in
// scripts/model/metrics (tracked) and written into the model card.
export function finish(model, version, samples, verdicts) {
  const result = auditResult(samples.map((s) => verdicts[s.id].verdict))
  const record = { model, version, date: new Date().toISOString().slice(0, 10), ...result }
  writeFileSync(auditPath(model), `${JSON.stringify(record, null, 2)}\n`)
  writeCard()
  return record
}
