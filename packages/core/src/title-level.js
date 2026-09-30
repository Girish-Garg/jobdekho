// What a title says about seniority, as a band of years, and only when it
// says something. level.js files an unmarked title as mid for the filters;
// here an unmarked title is unknown, because the fit has to tell "the ad
// never said" from "the ad said mid".
const INTERNSHIP = /\b(intern|interns|internship|trainee|apprentice|apprenticeship|co-?op)\b/i
const EXECUTIVE = /\b(chief|cto|ceo|coo|cfo|cio|ciso|vice[ -]president|vp|head of|director|president)\b/i
const STAFF = /\b(staff|principal|distinguished|fellow|architect)\b/i
// "SSE" is how Indian boards shorten Senior Software Engineer.
const SENIOR = /\b(senior|snr|sr|sse|lead|manager|supervisor)\b/i
const ENTRY = /\b(graduate|new ?grad|fresher|freshers|junior|jr|associate|entry[ -]level|campus|early career)\b/i

// "SDE 2", "Engineer II", "Analyst 4", or a numeral closing the role part
// ("Software Engineer II, Payments"). "Team 1" names a group, not a rung.
const RANK = /\b(?:sde|swe|engineer|developer|analyst)[\s-]*(i{1,3}|iv|[1-4])\b|\b(i{1,3}|iv|[1-4])\s*$/i
const NOT_RANK = /\b(team|group|squad|pod|unit|shift|batch|track|req)\s*#?\s*(i{1,3}|iv|[1-4])\s*$/i
const RANK_LEVEL = { i: 'entry', 1: 'entry', ii: 'mid', 2: 'mid', iii: 'senior', 3: 'senior', iv: 'staff', 4: 'staff' }

// The years each level usually means in this market.
export const LEVEL_YEARS = {
  internship: [0, 0], entry: [0, 2], mid: [1, 4], senior: [4, 8], staff: [7, 15], executive: [10, 30],
}

function rankLevel(title) {
  const role = title.split(/\s*[,|(]\s*|\s+-\s+/)[0]
  for (const part of [role, title]) {
    if (NOT_RANK.test(part)) continue
    const m = RANK.exec(part)
    if (m) return RANK_LEVEL[(m[1] || m[2]).toLowerCase()]
  }
  return null
}

// { level, band } or null. Most specific first, as level.js orders them.
export function titleLevel(title) {
  const t = String(title || '')
  let level = null
  if (INTERNSHIP.test(t)) level = 'internship'
  else if (EXECUTIVE.test(t)) level = 'executive'
  else if (STAFF.test(t)) level = 'staff'
  else if (SENIOR.test(t)) level = 'senior'
  else if (ENTRY.test(t)) level = 'entry'
  else level = rankLevel(t)
  return level ? { level, band: LEVEL_YEARS[level] } : null
}
