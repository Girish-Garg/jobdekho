import { SKILLS, SPELLING_ID, PLAIN_RE, PLAIN_ID, SPECIAL, spellings } from './skill-table.js'

// Every skill a text names, as [{ id, index }]. Each hit blanks its span, so
// a shorter spelling can never be read inside a longer one a second time.
export function findSkills(text) {
  const hits = []
  const blank = (id) => (m, offset) => {
    hits.push({ id, index: offset })
    return ' '.repeat(m.length)
  }
  let rest = String(text || '').replace(PLAIN_RE, (m, offset) => blank(PLAIN_ID.get(m.toLowerCase()))(m, offset))
  for (const { id, re } of SPECIAL) {
    re.lastIndex = 0
    rest = rest.replace(re, blank(id))
  }
  return hits
}

// A skill as a person typed it ("ReactJS", "golang"), as the table's id, or
// null for one the table does not know. The caller keeps an unknown skill as
// typed and matches it literally, so nothing a person listed stops counting.
export function canonicalSkill(name) {
  const key = String(name || '').toLowerCase().trim()
  return SKILLS.has(key) ? key : SPELLING_ID.get(key) ?? null
}

export const skillLabel = (id) => SKILLS.get(id)?.label ?? id

// Every spelling under which a resume may show `term`: the term, its plural,
// its own spellings, and those of its variants ("sql" is shown by "mysql").
// Only kindOf counts here, never implies: "Django" does not show Python.
export function spellingsOf(term) {
  const id = canonicalSkill(term)
  const kin = id ? [...SKILLS.values()].filter((s) => s.id === id || s.kindOf === id) : []
  return [...new Set([term, `${term}s`, ...kin.flatMap(spellings)])]
}
