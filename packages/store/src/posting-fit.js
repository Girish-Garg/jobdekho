import { gradeFor } from '@jobdekho/core/score.js'
import { ghostSignals, legitimacy } from '@jobdekho/core/ghost.js'

// legitimacy and ghostSignals need no profile, so they belong on every
// posting the feed returns - ranked or not. descriptionText stops here
// either way: 4000 characters times a hundred rows is not a payload to send
// the browser just to justify a phrase like "very short job description".
export function withGhost(row, now = new Date()) {
  const { descriptionText, ...rest } = row
  return { ...rest, legitimacy: legitimacy(row, now), ghostSignals: ghostSignals(row, now) }
}

// grade derives from fit, so it exists only where ranking does. fit, reasons
// and breakdown are already on the row: scoreRows() put them there before
// the sort, and scoring again here would be the second computation the
// in-memory store no longer needs.
export function withFit(row, now = new Date()) {
  return { ...withGhost(row, now), grade: gradeFor(row.fit) }
}
