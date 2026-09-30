// Where the content part of a fit came from, part by part (skills, title),
// so a UI can show why a number landed where it did rather than asking to
// be trusted. The parts sum to the content score, not to the fit: the fit
// is content times the gates, which a card shows beside the bars as
// multipliers, each with its reason.

// A dropped part is left out rather than shown at zero: zero reads as a
// failed match, and the part was dropped precisely because the profile asked
// nothing of it.
//
// `points` stays unrounded so the parts sum to the content before its own
// rounding; rounding each part here could drift the total a point away.
//
// `max` is the part's ceiling in points, which is NOT its raw weight. A
// profile with no target titles drops that part and skills renormalise to
// the whole hundred. Carrying the ceiling here spares every caller the
// division, which is exactly the arithmetic a display got wrong by reading
// the raw weight as points and printing "32 of 4500".
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
