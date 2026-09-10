// Every timestamp the store holds is the canonical string Date.toISOString()
// produces, and only that form. It is fixed width with the most significant
// field first, so comparing two of them as strings is comparing them as
// moments, which is what lets "newest" and the staleness cutoff order rows
// without parsing a date per comparison. Anything unparseable becomes null
// rather than the string "Invalid Date", which would sort above every real
// date and read as freshly seen.
export function toIso(value) {
  if (value === null || value === undefined || value === '') return null
  const at = new Date(value)
  return Number.isNaN(at.getTime()) ? null : at.toISOString()
}
