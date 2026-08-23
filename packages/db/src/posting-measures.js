import { gte, lte, or, isNull } from 'drizzle-orm'
import { postings } from './schema.js'

// Query params arrive as strings. Number.isFinite('1') is false, which silently
// dropped every measure filter instead of applying it, so "Paid only" quietly
// returned unpaid postings.
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// A posting with no stated pay or tenure cannot be shown to satisfy a floor, so
// NULL fails those. Experience is the exception: an unstated requirement is not
// a barrier, so those rows stay visible.
export function measureConditions({ minStipend, maxDurationMonths, maxExperienceYears } = {}) {
  const out = []
  const pay = toNumber(minStipend)
  const months = toNumber(maxDurationMonths)
  const years = toNumber(maxExperienceYears)
  if (pay !== null) out.push(gte(postings.stipendMin, pay))
  if (months !== null) out.push(lte(postings.durationMonths, months))
  if (years !== null) {
    out.push(or(lte(postings.experienceYears, years), isNull(postings.experienceYears)))
  }
  return out
}
