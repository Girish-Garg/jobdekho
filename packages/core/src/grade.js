// A letter over the 0-100 fit percentage, so a card can say "B" instead of
// asking the reader to know what a 38 means.
//
// CALIBRATED TO A MEASURED DISTRIBUTION, not to schoolroom 90/80/70/60, and
// re-measured after the skills dimension stopped dividing by the size of the
// profile. That change moved everything: against a real 25 skill profile over
// 1880 live postings the maximum went from 69 to 84 and the median from 22 to
// 33, which turned these floors from "6% of postings score A" into 24%. A
// grade a quarter of the corpus earns says nothing.
//
// The floors are percentiles of that measured distribution rather than round
// numbers: A is the top 5% (62), B the top 12% (50), C the top 30% (38), D
// the top 65% (25). REVISIT them whenever WEIGHTS, the title and body credits,
// or HALF_MATCH change, because each moves the whole distribution and the
// letters have to move with it.
export const GRADE_BANDS = [['A', 62], ['B', 50], ['C', 38], ['D', 25]]

export function gradeFor(fit) {
  for (const [grade, floor] of GRADE_BANDS) if (fit >= floor) return grade
  return 'F'
}
