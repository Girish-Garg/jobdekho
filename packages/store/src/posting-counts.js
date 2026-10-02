import { gradeFor } from '@jobdekho/core/grade.js'

// The whole matching set's size and how many of it arrived in the last day,
// for the feed's title line. Counting the loaded page instead said "100 new
// today" whenever the first hundred rows happened to be new. Ranked, also how
// many fall in each grade, for the band dividers in the list.
const DAY_MS = 24 * 60 * 60 * 1000

export function countsOf(rows, ranked, now = Date.now()) {
  const newToday = rows.filter((row) => now - Date.parse(row.firstSeenAt ?? '') < DAY_MS).length
  if (!ranked) return { total: rows.length, newToday }
  const bands = {}
  for (const row of rows) {
    const grade = gradeFor(row.matchScore)
    bands[grade] = (bands[grade] ?? 0) + 1
  }
  return { total: rows.length, newToday, bands }
}
