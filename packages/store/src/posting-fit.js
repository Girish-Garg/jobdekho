import { gradeFor } from '@jobdekho/core/score.js'
import { ghostSignals, legitimacy } from '@jobdekho/core/ghost.js'
import { payLabel } from '@jobdekho/core/pay-label.js'
import { newness } from '@jobdekho/core/newness.js'
import { cautionFor } from './shared-ads.js'

// The red flags need no profile, so they belong on every posting the feed
// returns, ranked or not, with the two fields today's web app reads them
// by. payLabel is the pay in its one short form, dollars as dollars, and
// newness says 'new' or 'found-today' (core's newness.js).
// descriptionText stops here either way: a whole description times a
// hundred rows is not a payload to send the browser for a list.
export function withGhost(row, corpusRows = []) {
  const { descriptionText, ...rest } = row
  const caution = cautionFor(row, corpusRows)
  return {
    ...rest,
    caution,
    legitimacy: legitimacy({ caution }),
    ghostSignals: ghostSignals({ caution }),
    payLabel: payLabel(row.stipend, row.currency ?? undefined),
    newness: newness(row),
  }
}

// grade derives from fit, so it exists only where ranking does. fit, reasons
// and breakdown are already on the row: scoreRows() put them there before
// the sort, and scoring again here would be the second computation the
// in-memory store no longer needs.
export function withFit(row, corpusRows = []) {
  return { ...withGhost(row, corpusRows), grade: gradeFor(row.fit) }
}
