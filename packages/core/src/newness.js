const DAY_MS = 24 * 60 * 60 * 1000

const timeOf = (value) => {
  const at = Date.parse(value ?? '')
  return Number.isFinite(at) ? at : null
}

// What "New" means: the board's own posted date is within the last day.
// Measured on the owner's feed, 389 of the 914 postings marked New had been
// posted more than a week earlier, because New meant "first found today".
// Such a posting, and one from a board that gives no date, is 'found-today'
// instead. A date more than a day ahead is a wrong clock, not news.
export function newness(row, now = Date.now()) {
  const posted = timeOf(row?.postedAt)
  if (posted !== null && now - posted < DAY_MS && posted - now < DAY_MS) return 'new'
  const found = timeOf(row?.firstSeenAt)
  return found !== null && now - found < DAY_MS ? 'found-today' : null
}
