import { quote } from './tag.js'
import { bondFact, startFact, shiftFact } from './description-terms.js'
import { shippedModel } from './model/weights.js'
import { shippedAudits } from './model/audit.js'
import { withModelFacts } from './model/model-facts.js'

// Facts a fresher weighs before applying that a description states in so
// many words: a pre-placement offer, an address to send the resume to, how
// many openings, a bond, an immediate start, night or rotational shifts.
// Each keeps the words that said it. The plain readers here come first: a
// fact shown wrongly costs more than one missed, so each needs words that
// cannot mean much else, and an explicit "no" wins ("no PPO" shows
// nothing, "no bond" shows that). Where they find nothing, the facts model
// may, in wordings no rule lists, once its audit has passed (see
// model/model-facts.js).
export const linesOf = (text) => String(text ?? '').split(/\n+|(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
const said = (line) => `Says "${quote(line, 120)}"`

// The line under a heading, as Internshala's sections and others lay them out.
function under(lines, heading) {
  const at = lines.findIndex((line) => heading.test(line))
  return at >= 0 ? lines[at + 1] ?? '' : ''
}

const PPO = /\b(?:ppo|pre[- ]?placement offers?|convert(?:ed|ible)?\s+(?:in)?to\s+(?:a\s+)?full[- ]time|full[- ]time\s+offers?\s+(?:after|upon|on\s+(?:the\s+)?(?:successful\s+)?completion)\b)/i
const NO_PPO = /\b(?:no|not|without)\s+(?:any\s+)?(?:ppo|pre[- ]?placement|full[- ]time)/i
// In a US benefits list a PPO is a health plan, not an offer.
const HEALTH_PLAN = /\b(?:medical|health|dental|vision|insurance|hmo|hsa|401\s*\(?k\)?|benefits?|plans?)\b/i

function ppoFact(lines) {
  const line = lines.find((l) => PPO.test(l) && !NO_PPO.test(l) && !HEALTH_PLAN.test(l))
  if (line) return { value: 'PPO possible', evidence: said(line) }
  const perks = under(lines, /^perks$/i)
  return /\bjob offer\b/i.test(perks) ? { value: 'PPO possible', evidence: 'Perks list "Job offer"' } : null
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/i
const TO_APPLY = /\b(?:resumes?|cvs?|apply|applying|applications?|portfolio)\b/i
// An address that is itself for applying, whatever its line says.
const APPLY_DESK = /^(?:apply|applications?|careers?|jobs?|hiring|hr|recruit\w*|talent|resumes?|cv)\b[\w.+-]*@/i
const NOT_APPLY = /\b(?:questions?|accommodations?|accessib|disabilit|privacy|unsubscribe|fraud|scams?|grievance|concerned|legitimate|impersonat|phishing|suspicious|seems off|third[- ]party|does not accept|do not send)/i
// Addresses for help, not for applying.
const HELP_DESK = /^(?:accessibility|accommodations?|privacy|security|support|help|no-?reply|legal|compliance|grievance|abuse|dpo)@/i
const PERSONAL = /@(?:gmail|googlemail|yahoo|ymail|outlook|hotmail|live|rediffmail|icloud|protonmail)\./i

// An address to send the resume to, from a line about applying. A personal
// one (gmail and the like) is marked: real employers seldom recruit from one.
function emailFact(lines) {
  const line = lines.find((l) => EMAIL.test(l) && !NOT_APPLY.test(l) && (TO_APPLY.test(l) || APPLY_DESK.test(l.match(EMAIL)[0])))
  if (!line) return null
  const value = line.match(EMAIL)[0].replace(/\.$/, '')
  if (HELP_DESK.test(value)) return null
  return { value, personal: PERSONAL.test(value), evidence: said(line) }
}

const COUNT = /\b(\d{1,3})\s+(?:openings|positions|vacancies)\b|\b(?:openings|positions|vacancies)\s*[:-]\s*(\d{1,3})\b/i

function openingsFact(lines) {
  const listed = under(lines, /^number of openings$/i)
  const n = /^\d{1,3}$/.test(listed) ? Number(listed) : null
  const line = n ? null : lines.find((l) => COUNT.test(l))
  const count = n ?? (line ? Number(line.match(COUNT).slice(1).find(Boolean)) : null)
  if (!count) return null
  return { value: `${count} opening${count === 1 ? '' : 's'}`, evidence: line ? said(line) : `Number of openings: ${count}` }
}

export function descriptionFacts(text, { model = shippedModel('facts'), audits = shippedAudits() } = {}) {
  const lines = linesOf(text)
  const ruled = {
    ppo: ppoFact(lines),
    email: emailFact(lines),
    openings: openingsFact(lines),
    bond: bondFact(lines, said),
    start: startFact(lines, said),
    shift: shiftFact(lines, said),
  }
  return withModelFacts(ruled, lines, { model, audits })
}
