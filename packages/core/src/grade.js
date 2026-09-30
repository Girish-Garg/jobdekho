// A letter over the 0-100 fit, so a card can say "B" instead of asking the
// reader to know what a 38 means.
//
// FLOORS WITH A MEANING, not percentiles. Fit is content times gates (see
// score.js), so A is a job whose skills and title match well and that no gate
// holds back; B is a good match with one soft gap, or a solid one with none;
// C is worth a look; D is a long shot. Percentile floors guaranteed a share
// of A's even to a profile that fits nothing in the corpus, and the floors
// before these (62, 50, 38, 25) were tuned on one profile and did not
// transfer: another profile got A on under 1% of its feed, and of the jobs
// graded A for the demo profile, 22 of 47 hand-labelled ones were not a fit.
//
// Set before labelling, then checked against 269 hand labels on two
// profiles: 0.81 and 0.78 agreement, and moving every floor by 5 points
// either way keeps it between 0.73 and 0.86. REVISIT them against those
// labels whenever the content weights, the section weights or a gate
// changes.
export const GRADE_BANDS = [['A', 55], ['B', 40], ['C', 25], ['D', 12]]

export function gradeFor(fit) {
  for (const [grade, floor] of GRADE_BANDS) if (fit >= floor) return grade
  return 'F'
}
