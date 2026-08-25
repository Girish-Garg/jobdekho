// A letter over the 0-100 fit percentage, so a card can say "B" instead of
// asking the reader to know what a 38 means.
//
// CALIBRATED TO A MEASURED DISTRIBUTION, not to schoolroom 90/80/70/60.
// Across 1485 live postings against a realistic profile, fit topped out at 63
// and the bulk of the corpus sat in the twenties. That ceiling is structural:
// a skill in the posting title earns full credit, the same skill in the body
// earns 0.4, and real titles say "Full Stack Developer" rather than naming
// each skill, so the top of the scale is unreachable and schoolroom bands
// would grade every posting F. REVISIT these floors if WEIGHTS or the
// title/body credits change - they move the whole distribution, and the
// letters with it.
//
// Against that distribution these floors grade roughly 6% of postings A, 15%
// B, and split the enormous 20-29 mode between C and D so no single letter
// swallows half the feed. A matches the UI's "Strong fit" filter at 45. B
// sits at 35 rather than the "Good fit" filter's 30 on purpose: pulling
// 30-34, the top of the bulk, into B would make a third of the corpus read
// as above average, and a letter that common stops meaning anything.
export const GRADE_BANDS = [['A', 45], ['B', 35], ['C', 25], ['D', 15]]

export function gradeFor(fit) {
  for (const [grade, floor] of GRADE_BANDS) if (fit >= floor) return grade
  return 'F'
}
