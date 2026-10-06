import { shiftValue } from './shift-value.js'

// What a line the facts model picked states, as the fact the pane shows
// (see model/model-facts.js): { value } or, for an address, { value,
// personal }; null when its words give nothing a person could act on. The
// model says which fact a line is about; these read what it says, and
// keep to the plain readers' rules (description-facts.js): an explicit
// "no" is never shown as a yes, and an address for help is not one for
// applying.
const NOT_OFFERED = /\b(?:no|not|never|without|doesn'?t|isn'?t|cannot|won'?t)\b[^.;]{0,40}\b(?:ppo|pre[- ]?placement|full[- ]?time|permanent|job offer|conversion)/i
const HEALTH_PLAN = /\b(?:medical|health|dental|vision|insurance|hmo|hsa|401\s*\(?k\)?)\b/i
// An offer is a job to be had, on a condition or after the internship: a
// line with only one half is the job's own type ("Permanent, full-time",
// "Duration: 3 months (Full-time)") or another perk ("Letter of
// recommendation based on performance").
const OFFER = /\b(?:ppo|pre[- ]?placement|offers?|full[- ]?time|permanent|convert\w*|conversion|absorb\w*|hired?|fte|employment|placement)\b/i
const CONDITION = /\b(?:intern\w*|trainees?|training|program|after|upon|on (?:successful )?completion|based on|performance|performers?|opportunit\w*|potential|possib\w*|chance|may|might|could|eligible|considered|deserving|right ones|returning|return)\b/i
// "A full-time internship" or "Internship, full-time" is how the
// internship itself is worked, not what follows it.
const AS_WORKED = /\bfull[- ]?time\b,?\s+(?:[\w-]+\s+){0,2}internships?\b|\binternships?\b,?\s+\(?\s*full[- ]?time\b/gi

export function ppoValue(line) {
  if (NOT_OFFERED.test(line) || HEALTH_PLAN.test(line)) return null
  if (/\bppo\b|pre[- ]?placement/i.test(line)) return { value: 'PPO possible' }
  const rest = line.replace(AS_WORKED, ' ')
  return OFFER.test(rest) && CONDITION.test(line) ? { value: 'PPO possible' } : null
}

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)*\.[A-Z]{2,}/i
const HELP_DESK = /^(?:accessib\w*|accommodat\w*|disabilit\w*|privacy|security|support|help\w*|no-?reply|legal|compliance|grievance|abuse|fraud|dpo|ethics|eeo)\b/i
const NOT_APPLY = /\b(?:questions?|accommodations?|accessib|disabilit|privacy|unsubscribe|fraud|scams?|grievance|legitimate|impersonat|phishing|does not accept|do not send)/i
const PERSONAL = /@(?:gmail|googlemail|yahoo|ymail|outlook|hotmail|live|rediffmail|icloud|protonmail)\./i

export function emailValue(line) {
  const value = line.match(EMAIL)?.[0].replace(/\.$/, '')
  if (!value || NOT_APPLY.test(line) || HELP_DESK.test(value)) return null
  return { value, personal: PERSONAL.test(value) }
}

// "Immediate start", or how soon a joiner is wanted when it is within a
// month ("Immediate to 30 days", "join within 15 days"). A longer notice
// is a fact about the candidate, not about an early start.
const WITHIN = /\b(?:within|immediate(?:ly)?\s*(?:-|\u2013|to))\s*(\d{1,2})\s*(days?|weeks?)\b/i
const SOON = /\b(?:immediate(?:ly)?|asap|as soon as possible|right away)\b/i

export function startValue(line) {
  const within = line.match(WITHIN)
  if (within) {
    const days = Number(within[1]) * (/^w/i.test(within[2]) ? 7 : 1)
    return days <= 31 ? { value: `Join within ${within[1]} ${within[2].toLowerCase()}` } : null
  }
  return SOON.test(line) ? { value: 'Immediate start' } : null
}

export const FACT_VALUES = { ppo: ppoValue, email: emailValue, start: startValue, shift: shiftValue }
