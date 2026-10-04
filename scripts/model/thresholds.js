// Thresholds for a target precision, one per shown group (a pair of levels,
// a section kind), chosen on held-out scores.
//
// The candidates are a fixed grid walked from strict to lenient, and the
// walk stops at the first one whose precision falls under the target
// (fixed-sequence testing, as in Learn-then-Test). Picking whichever grid
// point looks best would let one lucky dip in the errors set the threshold.
// A point that covers too few postings to be measured is skipped, not
// failed, so the strict end of the grid cannot end the walk by chance.
export const GRID = [0.9999, 0.9995, 0.999, 0.998, 0.997, 0.996, 0.995, 0.994, 0.993, 0.992, 0.991, 0.99, 0.985, 0.98,
  0.975, 0.97, 0.96, 0.95, 0.94, 0.93, 0.92, 0.91, 0.9, 0.85, 0.8, 0.75, 0.7, 0.6, 0.5]

// `scored`: [{ confidence, right }]. { covered, right, precision } at t.
export function precisionAt(scored, t) {
  const kept = scored.filter((s) => s.confidence >= t)
  const right = kept.filter((s) => s.right).length
  return { covered: kept.length, right, precision: kept.length ? right / kept.length : null }
}

// The most lenient grid point that holds the target, or null when none does.
export function chooseThreshold(scored, target, { minSupport = 50, grid = GRID } = {}) {
  let chosen = null
  for (const t of grid) {
    const at = precisionAt(scored, t)
    if (at.covered < minSupport) continue
    if (at.precision < target) break
    chosen = t
  }
  return chosen
}

// One threshold per group: { [group]: t | null }.
export function chooseThresholds(byGroup, target, options) {
  return Object.fromEntries(Object.entries(byGroup).map(([group, scored]) => [group, chooseThreshold(scored, target, options)]))
}

// Thresholds chosen without each fold in turn, then applied to it: the
// precision a threshold keeps on companies that played no part in
// choosing it. `folds` is [{ train: byGroup, test: byGroup }].
export function crossFoldCheck(folds, target, options) {
  let covered = 0
  let right = 0
  for (const { train, test } of folds) {
    const thresholds = chooseThresholds(train, target, options)
    for (const [group, scored] of Object.entries(test)) {
      if (thresholds[group] == null) continue
      const at = precisionAt(scored, thresholds[group])
      covered += at.covered
      right += at.right
    }
  }
  return { covered, right, precision: covered ? right / covered : null }
}
