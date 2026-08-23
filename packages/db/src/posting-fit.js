import { explainScore } from '@jobdekho/core/score.js'

// A ranked page selects description_text so the fit and reasons on a card are
// computed against the very text the SQL scored, but the text stops here:
// 4000 characters times a hundred rows is not a payload to send the browser
// just to justify one number.
export function withFit(row, profile, idf) {
  const { fit, reasons } = explainScore(row, profile, idf)
  const { descriptionText, ...rest } = row
  return { ...rest, fit, reasons }
}
