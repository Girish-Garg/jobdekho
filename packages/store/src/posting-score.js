import { explainScore } from '@jobdekho/core/score.js'

// Core owns the rule for what is rankable; re-exported so callers cannot end
// up gating on a different answer than the one scorePosting() was built for.
export { canRank } from '@jobdekho/core/score.js'

// Scored across the whole matching set, before the sort and the minFit floor
// read it, which is where the SQL mirror computed match_score. That mirror
// existed only so ranking could precede LIMIT; with the corpus in memory the
// scorer itself runs here, so the number the feed sorts by and the number
// the card explains are one computation rather than two that had to be kept
// in agreement by hand and never were verified on a real row.
export function scoreRows(rows, profile, idf) {
  return rows.map((row) => {
    const { fit, reasons, breakdown } = explainScore(row, profile, idf)
    return { ...row, fit, reasons, breakdown, matchScore: fit }
  })
}
