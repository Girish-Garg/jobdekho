import { experienceFit } from './experience-fit.js'
import { placeFit } from './place-fit.js'
import { degreeRank } from './degree.js'

// The gates: what can make a perfectly worded job one this person cannot
// take or would not want, however well its skills and title match. Each is
// a multiplier with the phrase that explains it, and they multiply rather
// than add, because more matching keywords never make up for a job in
// another country or one that asks for eight more years.

// Internships are for people without a year of work behind them yet. For
// anyone past that, even a perfect-stack internship lands around a D: still
// in the feed, never recommended.
const INTERNSHIP = 0.3

// A floor the person does not meet costs less when the ad only prefers it.
const DEGREE_REQUIRED = 0.5
const DEGREE_PREFERRED = 0.85

const DEGREE_WORD = { bachelors: "a bachelor's degree", masters: "a master's degree", phd: 'a PhD' }

function roleType(row, years) {
  if (row.type !== 'internship' || years === null || years < 1) return { value: 1, why: null }
  return { value: INTERNSHIP, why: `an internship, and you have ${years} year${years === 1 ? '' : 's'} of work` }
}

function degree(row, held) {
  const asked = row.degreeMin || 'none'
  if (degreeRank(asked) <= degreeRank(held)) return { value: 1, why: null }
  return {
    value: row.degreeRequired ? DEGREE_REQUIRED : DEGREE_PREFERRED,
    why: `${row.degreeRequired ? 'needs' : 'prefers'} ${DEGREE_WORD[asked] ?? 'a higher degree'}`,
  }
}

// { level, place, type, degree }, each { value, why }. An internship offered
// to someone with work behind them is held back once, by the type gate: an
// internship's band of zero years would otherwise cost it a second time.
export function fitGates(row, features, ctx) {
  const type = roleType(row, ctx.years)
  return {
    level: type.value < 1 ? { value: 1, why: null } : experienceFit(features, ctx.years),
    place: placeFit(row.location, row.workMode, ctx.places),
    type,
    degree: degree(row, ctx.degree),
  }
}

export const gateProduct = (gates) => Object.values(gates).reduce((p, g) => p * g.value, 1)
