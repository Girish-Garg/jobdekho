import { wantedLevels, keepsUnstated } from '@jobdekho/core/filter.js'

// A seniority filter keeps the postings that state no level (see core's
// filter.js) rather than hiding them, so nothing real is lost to it: they
// come after every confirmed one, each marked `levelNotStated: true`, and
// the counts say how many there are, so the web app can set them apart under
// a "Level not stated" divider on whichever page they start. An
// Internship-only filter keeps none of them, so it marks none.
export const levelFilterOn = (opts = {}) => keepsUnstated(wantedLevels(opts))

const unstated = (row) => row.level == null

// The feed's order with the unstated postings after the rest, each part in
// the order asked for.
export function unstatedLast(order, on) {
  if (!on) return order
  return (a, b) => (unstated(a) - unstated(b)) || order(a, b)
}

export const markUnstated = (posting, on) => (on && unstated(posting) ? { ...posting, levelNotStated: true } : posting)

export const unstatedTotal = (rows, on) => (on ? { levelNotStatedTotal: rows.filter(unstated).length } : {})
