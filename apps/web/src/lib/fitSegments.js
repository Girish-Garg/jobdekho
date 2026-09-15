// Two numbers describe a dimension's part in the fit score: how much of the
// whole it could ever be worth (its max against the sum of every max), and
// how much of that it earned (its own 0 to 1 value). The row meter draws
// them as one segmented bar and the detail view as a labelled row each, so
// the pair is computed here once rather than in both, where the two drawings
// would drift apart the first time either was touched.
export const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export function fitSegments(breakdown, fit) {
  // A ranked row always has a score; a breakdown is not guaranteed. One plain
  // segment against fit out of 100 keeps the meter honest either way.
  if (!breakdown?.length) return [{ key: 'fit', widthPct: 100, fillPct: clamp01(fit / 100) * 100 }];
  const total = breakdown.reduce((sum, d) => sum + d.max, 0) || 1;
  return breakdown.map((d) => ({
    key: d.dimension,
    widthPct: (d.max / total) * 100,
    fillPct: clamp01(d.value) * 100,
  }));
}
