// What a title alone says about seniority. One rule set serves the level
// chip (level.js) and the fit (title-level.js): kept apart, the two read 59
// stored titles differently, so a card could say Entry while its fit card
// spoke of a senior role.
//
// Some boards separate words with "_" ("Intern_2027_SW", "IN_Senior
// Associate_Azure Data Engineer"), which hid every word from \b.
export const spaced = (title) => String(title || '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim()

const INTERNSHIP = /\b(interns?|internships?|apprentices?|apprenticeships?|co-?op|industrial training|summer analyst)\b/i
// In India a Graduate Engineer Trainee is a full-time first job far more
// often than a placement, so Trainee, GET and PGET read as entry and
// level.js asks the description whether it is a programme. GET and PGET
// count only in capitals: "Get" opens ordinary titles.
const TRAINEE = /\b(?:[Tt]rainees?|[Tt]raineeship|TRAINEES?|GET|PGET)\b/
const EXECUTIVE = /\b(chief|cto|ceo|coo|cfo|cio|ciso|vice[ -]president|vp|head of|director|president)\b/i
const STAFF = /\b(staff|principal|distinguished|fellow|architect)\b/i
// "SSE" is how Indian boards shorten Senior Software Engineer.
const SENIOR_WORD = /\b(senior|snr|sr|sse)\b/i
const SENIOR_ROLE = /\b(lead|manager|supervisor)\b/i
const ENTRY = /\b(graduate|new ?grad|freshers?|fresh graduates?|junior|jr|associate|entry[ -]level|campus|rotational|early career)\b/i
// GitLab and UPS name the middle rung Intermediate; Infosys writes "Mid Level".
const MID = /\b(intermediate|mid[ -]level)\b/i

// Banks give individual contributors the rank of Vice President: "VP
// Software Engineer" is a senior engineer, not an executive. Director, Head
// and Chief keep their meaning.
const VP = /\b(?:assistant\s+)?(?:vp|avp|vice[ -]president)\b/i
const IC_NOUN = /\b(engineer|developer|analyst|scientist|architect|programmer|specialist|consultant|lead)\b/i
const TOP = /\b(chief|head of|director|president of)\b/i

// "Software Engineer II", "SDE 3". "Team 1" names a group, not a rung.
const RANK = /\b(i{1,3}|iv|v|[1-5])\s*$/i
const NOT_RANK = /\b(team|group|squad|pod|unit|shift|batch|track|req)\s*#?\s*(i{1,3}|iv|v|[1-5])\s*$/i
const RANK_LEVEL = { i: 'entry', 1: 'entry', ii: 'mid', 2: 'mid', iii: 'senior', 3: 'senior', iv: 'staff', 4: 'staff', v: 'staff', 5: 'staff' }
// The rank closes the role, which a team, a stack or a place often follows:
// "SDE I (UI)", "Engineer II - Data", "SDE III -Backend", "SDE II, Payments".
const ROLE_PART = /\s*[,(]\s*|\s+[-|\u2013\u2014]\s*/

// A rank right after the role noun, wherever it sits: "SDE 2 Infra",
// "Engineer II Product Design", "Data Engineer (SDE 2)". Not a number of
// years: "Engineer 4-7 yrs" asks for experience, it is not rung four.
const NOUN_RANK = /\b(?:sde|swe|engineer|developer|analyst|technologist)[\s-]*(i{1,3}|iv|[1-4])\b(?!\s*(?:\+|-|to|\u2013|\u2014)?\s*\d*\s*\+?\s*(?:years?|yrs?)\b)/i

const said = (level, rule, match, group = 0) => ({ level, rule, word: match[group].trim() })

function rankOf(title) {
  const role = title.split(ROLE_PART)[0]
  for (const part of [title, role]) {
    if (NOT_RANK.test(part)) continue
    const m = RANK.exec(part)
    if (m) return said(RANK_LEVEL[m[1].toLowerCase()], 'rank', m)
  }
  const m = NOUN_RANK.exec(title)
  return m ? said(RANK_LEVEL[m[1].toLowerCase()], 'rank', m, 1) : null
}

function bankRank(title) {
  if (!VP.test(title) || !IC_NOUN.test(title) || TOP.test(title)) return null
  const rest = title.replace(new RegExp(VP.source, 'gi'), ' ')
  const inner = STAFF.exec(rest)
  return inner ? said('staff', 'staff', inner) : said('senior', 'bank-vp', VP.exec(title))
}

const first = (title, rules) => {
  for (const [re, level, rule] of rules) {
    const m = re.exec(title)
    if (m) return said(level, rule, m)
  }
  return null
}

// { level, rule, word } or null, most specific first. An explicit "senior"
// outranks a role word, so "Associate Product Manager" stays entry. rule
// 'trainee' is entry unless the description states a programme.
export function titleSays(title) {
  const t = spaced(title)
  return first(t, [[INTERNSHIP, 'internship', 'internship']])
    || bankRank(t)
    || first(t, [[EXECUTIVE, 'executive', 'executive'], [STAFF, 'staff', 'staff'], [SENIOR_WORD, 'senior', 'senior'],
      [TRAINEE, 'entry', 'trainee'], [ENTRY, 'entry', 'entry'], [MID, 'mid', 'mid'], [SENIOR_ROLE, 'senior', 'senior-role']])
    || rankOf(t)
}

const PHRASE = {
  'bank-vp': (word) => `Title says ${word}, a bank rank`,
  rank: (word) => `Title rank ${word}`,
}
export const titleEvidence = (found) => (PHRASE[found.rule] ?? ((word) => `Title says ${word}`))(found.word)
