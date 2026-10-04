import { tag, quote } from './tag.js'
import { titleSays, titleEvidence, spaced } from './title-rules.js'
import { programmeIn } from './programme.js'
import { yearsLevel, monthsAsked, levelForYears } from './level-years.js'
import { boardTypeEvidence } from './board-fields.js'
import { statedLevel } from './level-stated.js'

// Seniority ladder, lowest to highest. Index order drives range comparisons.
export const LEVELS = ['internship', 'entry', 'mid', 'senior', 'staff', 'executive']

// The level a posting states, as a tag (see tag.js), or null when nothing
// says. Nothing stated means unknown, never Mid: a default showed a fifth
// of postings as Mid on no evidence, and the feed lists unknown ones under
// their own divider instead.
//
// Evidence is tried in a fixed order and the first that applies decides:
// the board's filing, the title, an explicit statement in the description,
// the board's experience field, which recruiters fill from a picker and so
// only speaks when the text gives no years, and last what the description
// states in words (level-stated.js).
export function levelTag({ title = '', description = '', company = '', source = '', board = null, experience = null, experienceYears = null } = {}) {
  if (board?.type === 'internship') return tag('internship', 'board', boardTypeEvidence(board, source))
  const found = titleSays(title)
  if (found && found.rule !== 'trainee') return tag(found.level, 'title', titleEvidence(found))
  // A board that filed the posting as a job (a list of jobs, a Full-time
  // employment type) is never made an internship by inference.
  const programme = board?.type === 'job' ? null : programmeIn(description, company)
  if (programme) return tag('internship', 'text', `Says "${quote(programme.match)}"`)
  if (found) return tag('entry', 'title', titleEvidence(found))
  // Some boards put the range in the title itself: "Firmware Engineer(5-7 years)".
  const inTitle = yearsLevel(spaced(title))
  if (inTitle) return tag(inTitle.level, 'title', `Title ${inTitle.evidence.replace(/^Asks/, 'asks')}`)
  const asked = yearsLevel(description) || monthsAsked(description)
  if (asked) return tag(asked.level, 'text', asked.evidence)
  if (Number.isFinite(experienceYears)) {
    return tag(levelForYears(experienceYears), 'board', `Experience field: ${experience ?? `${experienceYears} years`}`)
  }
  const stated = statedLevel(description, company)
  return stated ? tag(stated.level, 'text', stated.evidence) : null
}

// The value alone: a level, or null when the posting does not say.
export function classifyLevel(title = '', description = '', context = {}) {
  return levelTag({ ...context, title, description })?.value ?? null
}

// A level's place on the ladder, or -1 for an unknown one: an unknown level
// is not mid, and a comparison must never treat it as one.
export function levelRank(level) {
  return LEVELS.indexOf(level)
}
