// The terms of the work a description states in so many words: a bond or a
// service agreement, an immediate start, night or rotational shifts (see
// description-facts.js, which reads the offer and how to apply). `said`
// quotes the line each was read from.
const NO_BOND = /\bno\s+(?:service\s+)?bond\b|\bwithout\s+(?:any\s+)?bond\b/i
const BOND_FOR = /\b(\d+(?:\.\d+)?)[- ]?(years?|yrs?|months?)\s+(?:service\s+)?(?:bond|agreement)\b|\bbond\s+(?:of|for)\s+(\d+(?:\.\d+)?)\s*(years?|yrs?|months?)\b/i
const BOND = /\b(?:service\s+agreement|bond)\b/i

export function bondFact(lines, said) {
  const none = lines.find((l) => NO_BOND.test(l))
  if (none) return { value: 'No bond', evidence: said(none) }
  const timed = lines.find((l) => BOND_FOR.test(l))
  if (timed) {
    const m = timed.match(BOND_FOR)
    const [n, unit] = m[1] ? [m[1], m[2]] : [m[3], m[4]]
    return { value: `${n}-${/^m/i.test(unit) ? 'month' : 'year'} bond`, evidence: said(timed) }
  }
  const line = lines.find((l) => BOND.test(l) && /\b(?:sign|signed|signing|serve|service|agreement)\b/i.test(l))
  return line ? { value: 'Service agreement', evidence: said(line) } : null
}

const NOW = /\b(?:immediate(?:ly)?\s+(?:joiners?|joining|start)|start\s+immediately|join\s+immediately|joining\s*:\s*immediate)\b/i

export function startFact(lines, said) {
  const line = lines.find((l) => NOW.test(l))
  return line ? { value: 'Immediate start', evidence: said(line) } : null
}

const SHIFTS = [[/\bnight\s+shifts?\b/i, 'Night shift'], [/\b(?:rotational|rotating)\s+shifts?\b/i, 'Rotational shifts'], [/\b(?:US|UK)\s+shifts?\b/, 'US or UK shift hours']]

// A company describing its product (labour-law compliance, payroll) names
// shifts that are not this job's.
const NOT_SCHEDULE = /\b(?:laws?|labou?r|compliance|regulat|payroll|overtime)\b/i

export function shiftFact(lines, said) {
  for (const [pattern, value] of SHIFTS) {
    const line = lines.find((l) => pattern.test(l) && !NOT_SCHEDULE.test(l))
    if (line) return { value, evidence: said(line) }
  }
  return null
}
