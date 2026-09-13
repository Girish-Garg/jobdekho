import { skillRegex } from './fit-dimensions.js'

// A ghost job is a posting that is not really hiring: a pipeline filler, a
// stale repost, a fishing exercise. Every signal here is judged only from
// data the pipeline actually stores, and silence in the data never counts
// against a posting: a missing date or description skips its check entirely,
// because this label accuses a real employer of wasting people's time, and a
// signal that misfires is worse than one that is missing.
//
// The rubric being adapted flags a posting when 2 or more hold: no pay
// disclosed, JD under 150 words, posted over 90 days ago, generic language
// with no specific tools, the same JD across 5+ boards. Its company-presence
// checks (LinkedIn page, employee count) are not answerable from anything
// stored here, so they are left out rather than approximated.
const THIN_WORDS = 150
const STALE_DAYS = 90
// Five different boards carrying one role is a blast; a handful of city
// variants on one board is not, which is why this counts sources.
const BLAST_SOURCES = 5

// Matching any of these SUPPRESSES the "generic" signal, so a gap in the list
// makes the check more accusing but a stray everyday word ("spring", "excel")
// only excuses. That asymmetry is why the list errs broad rather than pure.
// Exported so the resume tailoring's keyword coverage starts from this list.
export const TOOL_TERMS = [
  'javascript', 'typescript', 'python', 'java', 'kotlin', 'swift', 'c++', 'c#',
  'golang', 'php', 'ruby', 'rust', 'scala', 'matlab', 'react', 'angular', 'vue',
  'node', 'node.js', 'next.js', 'django', 'flask', 'spring', 'laravel', 'rails',
  '.net', 'html', 'css', 'tailwind', 'bootstrap', 'wordpress', 'shopify',
  'android', 'ios', 'flutter', 'sql', 'mysql', 'postgresql', 'mongodb', 'redis',
  'kafka', 'spark', 'hadoop', 'snowflake', 'tableau', 'power bi', 'excel',
  'pandas', 'numpy', 'tensorflow', 'pytorch', 'opencv', 'aws', 'azure', 'gcp',
  'docker', 'kubernetes', 'terraform', 'jenkins', 'git', 'linux', 'selenium',
  'graphql', 'api', 'figma', 'photoshop', 'illustrator', 'canva', 'autocad',
  'solidworks', 'jira', 'salesforce', 'sap', 'tally', 'seo', 'google analytics',
  'unity', 'blender',
]

const wordCount = (text) => text.split(/\s+/).length

function daysOld(postedAt, now) {
  if (!postedAt) return null
  const at = new Date(postedAt).getTime()
  return Number.isNaN(at) ? null : (new Date(now).getTime() - at) / 86400000
}

// Months read better than day counts at this age; past a year the number
// stops adding anything.
const agePhrase = (days) =>
  days >= 365 ? 'posted over a year ago' : `posted ${Math.floor(days / 30)} months ago`

// Human-readable phrases, shown to the user as-is.
export function ghostSignals(posting, now = new Date()) {
  const signals = []
  if (posting.stipend == null || String(posting.stipend).trim() === '') {
    signals.push('no pay stated')
  }
  // Rows scraped before descriptionText existed carry only a 280 character
  // snippet; reading that as a thin JD would flag most of the historical
  // database. So only the full text field is ever judged for length, and an
  // empty one is treated as a scrape gap, not as an employer saying nothing.
  const text = typeof posting.descriptionText === 'string' ? posting.descriptionText.trim() : ''
  if (text && wordCount(text) < THIN_WORDS) signals.push('very short job description')
  // A board that never published a date is not evidence of age.
  const days = daysOld(posting.postedAt, now)
  if (days !== null && days > STALE_DAYS) signals.push(agePhrase(days))
  // Judged only on a description long enough that naming no tool at all is a
  // choice, and board-attached skill tags count as named tools: what matters
  // is whether the employer said anything specific, not where they said it.
  if (text && wordCount(text) >= THIN_WORDS && !(posting.tags || []).length) {
    const hay = `${posting.title || ''} ${text}`.toLowerCase()
    if (!TOOL_TERMS.some((term) => skillRegex(term).test(hay))) {
      signals.push('no specific skills or tools named')
    }
  }
  // Counted in distinct SOURCES, not postings. groupCount cannot carry this
  // signal: it also counts one role listed city by city, so an employer
  // hiring in five offices would look identical to a blast. The same role
  // turning up on five different boards is the thing worth flagging. Absent
  // the distinct count the signal is skipped rather than approximated, since
  // an approximation here accuses a real employer.
  const boards = Number(posting.groupSourceCount) || 0
  if (boards >= BLAST_SOURCES) signals.push(`listed on ${boards} job boards`)
  return signals
}

// The rubric's verdict is binary at 2 signals; on a four level scale that
// boundary becomes the midline. Zero signals is clean. One costs a level but
// not the label, because a single blemish is ordinary here: undisclosed pay
// alone describes a large share of real internships. And 'suspicious', the
// level that reads as an accusation, demands more than the rubric's minimum,
// since every unknowable check was skipped rather than counted and three
// independent signals on stored data is past coincidence.
const LEGITIMACY_BY_COUNT = ['high', 'medium', 'low']

export function legitimacy(posting, now = new Date()) {
  const count = ghostSignals(posting, now).length
  return count >= 3 ? 'suspicious' : LEGITIMACY_BY_COUNT[count]
}
