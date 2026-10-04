import { writeFileSync } from 'node:fs'
import { AUDIT_FILE, readAudits } from '@jobdekho/core/model/audit.js'
import { auditResult } from './stats.js'
import { writeCard } from '../card.js'

// Where a review stands: how many are checked, right and wrong, and the
// first sample not yet checked, which is where the page resumes.
export function progress(samples, verdicts) {
  const checked = samples.filter((s) => verdicts[s.id])
  const wrong = checked.filter((s) => verdicts[s.id].verdict === 'wrong').length
  const next = samples.findIndex((s) => !verdicts[s.id])
  return { total: samples.length, checked: checked.length, right: checked.length - wrong, wrong, resumeAt: next < 0 ? 0 : next, done: samples.length > 0 && next < 0 }
}

// The record a finished review leaves, in the shape core's model/audit.js
// reads. The bound is rounded down, so a record never reads better than
// the review was.
export function auditRecord(version, verdicts, now = new Date()) {
  const result = auditResult(verdicts)
  return {
    version,
    passed: result.passed,
    samples: result.checked,
    errors: result.wrong,
    lowerBound: Math.floor(result.lowerBound * 10000) / 10000,
    reviewedAt: now.toISOString().slice(0, 10),
  }
}

// The finished review of this version, if there is one.
export function savedAudit(model, version, file = AUDIT_FILE) {
  const record = readAudits(file)[model]
  return record?.version === version ? record : null
}

// A finished review: its record goes into core's audit.json, beside the
// other models' records, where it decides whether the app shows the
// model's output, and into the model card.
export function finish(model, version, samples, verdicts, { file = AUDIT_FILE, card = true } = {}) {
  const record = auditRecord(version, samples.map((s) => verdicts[s.id].verdict))
  writeFileSync(file, `${JSON.stringify({ ...readAudits(file), [model]: record }, null, 2)}\n`)
  if (card) writeCard()
  return record
}
