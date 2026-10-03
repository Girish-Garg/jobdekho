import { titleSays } from './title-rules.js'

// What a title says about seniority, as a band of years, and only when it
// says something: the fit has to tell "the ad never said" from "the ad said
// mid". The words are the level chip's own (title-rules.js), so the chip and
// the fit card cannot read one title two ways.

// The years each level usually means in this market.
export const LEVEL_YEARS = {
  internship: [0, 0], entry: [0, 2], mid: [1, 4], senior: [4, 8], staff: [7, 15], executive: [10, 30],
}

// { level, band } or null.
export function titleLevel(title) {
  const found = titleSays(title)
  return found ? { level: found.level, band: LEVEL_YEARS[found.level] } : null
}
