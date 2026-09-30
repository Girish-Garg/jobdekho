// How old a posting can be and still be worth anything. A job posted two
// months ago is filled or forgotten far more often than not, and one no
// board has listed for two months is gone; the person chose both lines.
//
// Posted too long ago is judged from the date the board gives. A posting
// with none is not judged by when JobDekho first saw it: a still-listed job
// dropped for that reason would come straight back on the next scrape as
// "new today", so an undated one goes only once it stops being listed.
export const MAX_POSTED_DAYS = 60
export const MAX_UNLISTED_DAYS = 60

const DAY_MS = 24 * 60 * 60 * 1000

function olderThan(iso, days, now) {
  const at = Date.parse(iso ?? '')
  return Number.isFinite(at) && now - at > days * DAY_MS
}

// At the scrape: not stored at all.
export const postedTooLongAgo = (posting, now = Date.now()) => olderThan(posting?.postedAt, MAX_POSTED_DAYS, now)

// On disk: posted too long ago, or listed nowhere for too long.
export const outOfDate = (row, now = Date.now()) =>
  postedTooLongAgo(row, now) || olderThan(row?.lastSeenAt, MAX_UNLISTED_DAYS, now)
