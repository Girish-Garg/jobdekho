// How close a posting's title is to a title the person wants, 0 to 1: the
// share of the wanted title's words found in it, as before, with three
// fixes. Spellings are folded (SDE, fullstack, developer = engineer); a small
// family table gives part credit (a full stack person reading a frontend
// role); and a word that makes it a different job costs, because "Software
// Test Engineer" contains every word of "software engineer".
const FOLD = [
  [/\bsdes?\b/g, 'software engineer'], [/\bswe\b/g, 'software engineer'],
  [/\b(?:mern|mean|mevn)(?:\s+stack)?\b/g, 'fullstack'],
  [/\bfull[\s-]?stack\b/g, 'fullstack'], [/\bfront[\s-]?end\b/g, 'frontend'], [/\bback[\s-]?end\b/g, 'backend'],
  [/\b(?:developers?|development|devs?|programmers?|engg|engineering|engineers)\b/g, 'engineer'],
  [/\bsw\b/g, 'software'], [/\bweb\s+application\b/g, 'web'],
]

// Seniority is the level gate's job, so its words would count twice here.
const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'at', 'to', 'with', 'on', 'senior', 'junior',
  'jr', 'sr', 'sse', 'lead', 'staff', 'principal', 'associate', 'intern', 'internship', 'trainee', 'i', 'ii', 'iii', 'iv',
  'v', 'fresher', 'freshers', 'entry', 'level', 'remote', 'hybrid', 'india', 'wfh', 'urgent', 'hiring', 'immediate',
  'joiner', 'contract', 'job', 'role', 'opening', 'mid'])

export function titleWords(title) {
  let t = String(title || '').toLowerCase()
  for (const [re, to] of FOLD) t = t.replace(re, to)
  return [...new Set((t.match(/[a-z0-9+#]+/g) || []).filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w)))]
}

export const wantedTitles = (titles = []) => titles.map(titleWords).filter((words) => words.length)

const FAMILY = {
  fullstack: { frontend: 0.7, backend: 0.7, web: 0.7, software: 0.5 },
  software: { backend: 0.6, frontend: 0.6, fullstack: 0.7, web: 0.5, application: 0.5, product: 0.4, platform: 0.4 },
  frontend: { fullstack: 0.6, web: 0.7, ui: 0.6 },
  backend: { fullstack: 0.6, software: 0.5, api: 0.5, server: 0.5 },
}

// Words that make it a different job, checked only when no wanted title
// holds them, and only the strongest counts. The first group changes the
// work itself; the second keeps the craft but moves the specialism.
const CHANGE = new Map([
  ...['test', 'testing', 'qa', 'quality', 'sdet', 'tester', 'support', 'sales', 'marketing', 'recruiter', 'recruitment',
    'hr', 'finance', 'accountant', 'accounting', 'operations', 'admin', 'administrator', 'teacher', 'tutor', 'trainer',
    'content', 'writer', 'designer', 'consultant', 'analyst', 'manager', 'director', 'head', 'vp', 'officer',
    'executive', 'counsellor', 'customer', 'business', 'strategist', 'specialist', 'coordinator', 'mentor'].map((w) => [w, 0.35]),
  ...['data', 'ml', 'devops', 'sre', 'reliability', 'security', 'network', 'embedded', 'firmware', 'hardware', 'mobile',
    'android', 'ios', 'game', 'blockchain', 'cloud', 'infrastructure', 'mainframe', 'sap', 'salesforce', 'erp', 'crm',
    'architect', 'research', 'scientist', 'automation', 'solutions'].map((w) => [w, 0.6]),
])

// { value, changedBy }: changedBy is the word that made it another job.
export function titleMatch(postingTitle, wanted) {
  const hay = titleWords(postingTitle)
  let best = { value: 0, changedBy: null }
  for (const want of wanted) {
    let got = 0
    for (const w of want) got += hay.includes(w) ? 1 : Math.max(0, ...hay.map((h) => FAMILY[w]?.[h] ?? 0))
    const changer = hay.filter((h) => CHANGE.has(h) && !want.includes(h)).sort((a, b) => CHANGE.get(a) - CHANGE.get(b))[0]
    const value = (got / want.length) * (changer ? CHANGE.get(changer) : 1)
    if (value > best.value) best = { value, changedBy: changer ?? null }
  }
  return best
}
