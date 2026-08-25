// Where a fit score came from, dimension by dimension, so a UI can show why a
// number landed where it did rather than asking to be trusted.

// A dropped dimension is left out rather than shown at zero: zero reads as a
// failed match, and the dimension was dropped precisely because the profile
// asked nothing of it.
//
// `points` stays unrounded so the parts sum to the fit before its own
// rounding; rounding each part here could drift the total a point away from
// the number the card shows.
//
// `max` is the dimension's ceiling in fit points, which is NOT its raw weight.
// A profile with no target titles drops that dimension and the rest
// renormalise over a smaller total, so skills is worth 45 points of 100 on a
// full profile and 60 on that one. Carrying the ceiling here spares every
// caller the division, which is exactly the arithmetic a display got wrong by
// reading the raw weight as points and printing "32 of 4500".
export function buildBreakdown(values, weights) {
  return Object.entries(values)
    .filter(([dimension]) => weights[dimension] > 0)
    .map(([dimension, value]) => ({
      dimension,
      value,
      weight: weights[dimension],
      points: (100 * weights[dimension] * value) / weights.total,
      max: (100 * weights[dimension]) / weights.total,
    }))
}
