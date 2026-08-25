import { explainScore, gradeFor } from '@jobdekho/core/score.js'
import { ghostSignals, legitimacy } from '@jobdekho/core/ghost.js'

// legitimacy and ghostSignals need no profile, so they belong on every
// posting the feed returns - ranked or not. descriptionText stops here
// either way: 4000 characters times a hundred rows is not a payload to send
// the browser just to justify a phrase like "very short job description".
export function withGhost(row, now = new Date()) {
  const { descriptionText, ...rest } = row
  return { ...rest, legitimacy: legitimacy(row, now), ghostSignals: ghostSignals(row, now) }
}

// grade and breakdown both derive from fit, so they exist only where ranking
// does. explainScore hands back the breakdown alongside the reasons, so one
// scoring pass serves both and the wording stays core's to own.
export function withFit(row, profile, idf) {
  const { fit, reasons, breakdown } = explainScore(row, profile, idf)
  return { ...withGhost(row), fit, reasons, grade: gradeFor(fit), breakdown }
}
