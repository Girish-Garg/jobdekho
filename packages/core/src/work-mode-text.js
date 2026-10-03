// Where the work happens, as a description states it. Descriptions were never
// read for this, and where one states the mode the stored tag agreed 30% of
// the time: "Workplace type: Hybrid" under a bare city read as an office.
//
// Only statements count, each a phrase that says how this job is worked,
// never a single word: "remote" alone is as often "remote teams" or "remote
// monitoring".
const MODE = '(hybrid|remote|on[- ]?site|onsite|in[- ]office|office|work from home|wfh|work from office|wfo)'
const FIELD = new RegExp(`\\b(?:work(?:place)?[ -]?(?:type|mode|model|arrangement|setup|style)|location type|working (?:model|mode)|mode of work|job mode|(?:job |work )?location)\\s*[:\\-\\u2013]\\s*(?:fully\\s+|100%\\s+)?${MODE}\\b`, 'i')
const ROLE = '(?:this|the)\\s+(?:role|position|job|opportunity|internship)\\s+is\\s+(?:an?\\s+)?(?:fully\\s+|100%\\s+)?'
const FIELD_MODE = { hybrid: 'hybrid', remote: 'remote', 'work from home': 'remote', wfh: 'remote' }
const fieldMode = (word) => FIELD_MODE[word.toLowerCase()] ?? 'onsite'
// Days in the office a week: five is an office job, fewer a hybrid one.
const daysMode = (digit) => (digit === '5' ? 'onsite' : 'hybrid')

// A statement about this job outranks one about the company ("our hybrid
// work model") when the two disagree. A null mode is read from the match.
const STATEMENTS = [
  ['own', fieldMode, FIELD],
  ['own', 'hybrid', new RegExp(`\\b${ROLE}hybrid\\b`, 'i')],
  ['own', 'remote', new RegExp(`\\b${ROLE}remote\\b`, 'i')],
  ['own', 'onsite', new RegExp(`\\b${ROLE}(?:on[- ]?site|office[- ]based|in[- ]office)\\b`, 'i')],
  ['any', daysMode, /\b([1-5])\s*(?:days?|x)\s*(?:(?:a|per|\/|each|in\s+a)\s*week\s*)?(?:in|from|at)\s+(?:the\s+|our\s+)?office\b/i],
  ['any', daysMode, /\b(?:in|from|at)\s+(?:the\s+|our\s+)?office\s+(?:for\s+)?([1-5])\s*(?:days?|x)\b/i],
  ['any', daysMode, /\b([1-5])\s*days?\s*(?:of\s+)?(?:wfo|work from office)\b/i],
  ['any', 'hybrid', /\bhybrid\s+(?:work|working|model|role|position|schedule|arrangement|mode|set-?up|policy|opportunity|job|internship|environment)\b/i],
  ['any', 'remote', /\b(?:fully|100%|completely|entirely|permanently)\s+remote\b|\bremote[- ]first\b|\bremote\s+(?:role|position|job|opportunity|internship)\b|\bwork(?:ing)?\s+(?:fully\s+)?remotely\b/i],
  // A home-office allowance or a few days at home say nothing about the job.
  ['any', 'remote', /\bwork(?:ing)?\s+from\s+(?:home|anywhere)\b(?!\s+(?:allowance|stipend|reimbursement|setup|set-up|equipment|budget|benefit|days?|option|flexibility|policy))|\bwfh\b(?!\s+(?:allowance|days?|option))/i],
  ['any', 'onsite', /(?<![1-4]\s*days?\s*(?:of\s+)?)(?:\bwork(?:ing)?\s+from\s+(?:the\s+|our\s+)?office\b|\bwfo\b)(?!\s+(?:for\s+)?[1-4]\s*(?:days?|x)\b)|\b(?:fully|100%)\s+on[- ]?site\b|\bon[- ]?site\s+(?:role|position|job|opportunity|internship)\b|\b(?:in[- ]office|office[- ]based)\s+(?:role|position|job)\b/i],
]

// "not remote", "no work from home", "non-remote", "remote work is not
// possible": the clause says the opposite of its words.
const NEG_BEFORE = /\b(?:not|no|non|never|isn['’]?t|aren['’]?t|cannot|can['’]?t|without)\b[\s\w-]{0,20}$/i
const NEG_AFTER = /^[\s\w-]{0,20}\b(?:is|are)\s+not\s+(?:possible|available|allowed|an option|offered|supported)/i

function* found(text) {
  for (const [scope, mode, re] of STATEMENTS) {
    for (const m of text.matchAll(new RegExp(re.source, 'gi'))) {
      const before = text.slice(Math.max(0, m.index - 30), m.index).split(/[.;!?\n]/).pop()
      const after = text.slice(m.index + m[0].length, m.index + m[0].length + 45)
      if (NEG_BEFORE.test(before) || NEG_AFTER.test(after)) continue
      yield { scope, mode: typeof mode === 'function' ? mode(m[1]) : mode, words: m[0] }
    }
  }
}

// Where statements disagree, hybrid wins over remote (a few days at home is
// still hybrid), and anything else is a contradiction that says nothing.
function settle(list) {
  const modes = new Set(list.map((s) => s.mode))
  if (modes.size === 1) return list[0]
  if (modes.size === 2 && modes.has('hybrid') && modes.has('remote')) return list.find((s) => s.mode === 'hybrid')
  return null
}

// { mode, words } or null.
export function modeInText(description) {
  const text = String(description || '')
  if (!/remote|hybrid|on-?site|office|home|wfh|wfo/i.test(text)) return null
  const all = [...found(text)]
  if (!all.length) return null
  const own = all.filter((s) => s.scope === 'own')
  return (own.length && settle(own)) || settle(all)
}
