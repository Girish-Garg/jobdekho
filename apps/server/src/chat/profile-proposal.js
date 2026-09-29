import { cleanOp } from './profile-ops-clean.js'
import { normalizeWorking, stamp, conflictOf, applyOp } from './profile-ops-apply.js'
import { diffOp } from './profile-ops-diff.js'

// However many the model lists, a card past this is more than a person
// reads before pressing Apply.
const MAX_OPS = 20

// The model's profile proposal, validated against the record as it is now:
// every op cleaned (profile-ops-clean.js), an op naming an id the record
// does not have dropped, each op applied in turn to a working copy so a
// later op sees the earlier ones, and one diff line per visible change
// written from the record itself. Null when nothing survives.
//
//   { kind: 'profile', ops, diff: [{ label, before, after }] }
export function validateProfileProposal(raw, record) {
  let working = normalizeWorking(record)
  const ops = []
  const diff = []
  for (const candidate of (Array.isArray(raw?.ops) ? raw.ops : []).slice(0, MAX_OPS)) {
    const op = cleanOp(candidate)
    if (!op || conflictOf(op, working)) continue
    const stamped = stamp(op, working)
    const next = applyOp(stamped, working)
    const lines = diffOp(stamped, working, next)
    if (!lines.length) continue
    ops.push(stamped)
    diff.push(...lines)
    working = next
  }
  return ops.length ? { kind: 'profile', ops, diff } : null
}

// The stored ops against the record as it is when the person presses Apply.
// Every op is checked again, in order: an entry deleted since, or a field
// edited since, stops the whole change with the sentence saying which, so a
// proposal is applied whole or not at all. Resolves the record to save (in
// the store's shape, with no resume fields in it to overwrite) or the
// conflict.
export function applyProfileOps(ops, record) {
  let working = normalizeWorking(record)
  for (const op of ops) {
    const conflict = conflictOf(op, working)
    if (conflict) return { conflict }
    working = applyOp(op, working)
  }
  return { profile: working }
}
