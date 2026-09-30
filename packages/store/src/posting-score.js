import { scorePosting } from '@jobdekho/core/score.js'
import { featuresFor } from './fit-inputs.js'

// Core owns the rule for what is rankable; re-exported so callers cannot end
// up gating on a different answer than the one scorePosting() was built for.
export { canRank } from '@jobdekho/core/score.js'

// Scored across the whole matching set, before the sort and the minFit floor
// read it, so the number the feed sorts by and the number the card explains
// are one computation. `ctx` is the person's side of the fit (fitContextFor),
// built once per request; `corpusRows` keys the features read for rows
// stored before features existed. fit, reasons and breakdown are what every
// reader has always had; why, gates and content are the fit card's detail.
export function scoreRows(rows, ctx, corpusRows) {
  return rows.map((row) => {
    const { fit, reasons, breakdown, why, gates, content } = scorePosting(row, ctx, featuresFor(corpusRows, row))
    return { ...row, fit, reasons, breakdown, why, gates, content, matchScore: fit }
  })
}
