import { existsSync, readFileSync } from 'node:fs'

// The owner's audit of each shipped model, shipped beside the weights in
// audit.json and written by the review page (scripts/model/review) once
// every sample has its verdict:
//
//   { "sections": { "version": 1, "passed": true, "samples": 250,
//                   "errors": 1, "lowerBound": 0.9811, "reviewedAt": "..." } }
//
// A model's output is shown only when its record is for the very version
// shipped and passed: the one-sided 95% Clopper-Pearson lower bound on its
// precision is at least 98%. A model is proven before it is promised, so
// the file is absent, and the model off, until a review is done, and a new
// version is off again until it is reviewed in turn.
export const AUDIT_FILE = new URL('./audit.json', import.meta.url)
export const BAR = 0.98

// Every record in the file, read fresh: {} when there is none yet.
export function readAudits(file = AUDIT_FILE) {
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

let shipped = null

// The records as shipped, read once per process.
export function shippedAudits() {
  if (!shipped) shipped = readAudits()
  return shipped
}

export function auditPassed(audits, model) {
  const record = audits?.[model?.name]
  return Boolean(record && record.version === model.version && record.passed === true && record.lowerBound >= BAR)
}
