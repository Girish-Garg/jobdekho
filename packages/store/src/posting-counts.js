import { gradeFor } from '@jobdekho/core/grade.js'
import { newness } from '@jobdekho/core/newness.js'

// The whole matching set's size and how many of it arrived in the last day,
// for the feed's title line. Counting the loaded page instead said "100 new
// today" whenever the first hundred rows happened to be new. Ranked, also how
// many fall in each grade, for the band dividers in the list.
//
// newToday counts first sightings, as today's web app reads it; postedToday
// and foundToday split it the way "New" is meant (core's newness.js): the
// board's own date within a day, or first found today but posted earlier.
const DAY_MS = 24 * 60 * 60 * 1000

export function countsOf(rows, ranked, now = Date.now()) {
  const newToday = rows.filter((row) => now - Date.parse(row.firstSeenAt ?? '') < DAY_MS).length
  const fresh = rows.map((row) => newness(row, now))
  const counts = {
    total: rows.length,
    newToday,
    postedToday: fresh.filter((n) => n === 'new').length,
    foundToday: fresh.filter((n) => n === 'found-today').length,
  }
  if (!ranked) return counts
  const bands = {}
  for (const row of rows) {
    const grade = gradeFor(row.matchScore)
    bands[grade] = (bands[grade] ?? 0) + 1
  }
  return { ...counts, bands }
}
