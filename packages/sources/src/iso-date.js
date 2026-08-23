// Boards publish dates in whatever their backend happens to use: ISO strings,
// plain "2026-02-12", "2026-08-03 09:42:31 UTC", or epoch millis as a number.
// An unparseable value must become null rather than throw, or one odd row
// would take down the whole source.
export function toIso(value) {
  if (!value) return null
  const date = new Date(typeof value === 'number' ? value : Date.parse(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
