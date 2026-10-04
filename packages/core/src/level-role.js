import { titleSays } from './title-rules.js'
import { negated, namesOthers, saying } from './level-guards.js'

// The description naming the role it hires for, with a level word: "We are
// looking for a Senior Data Engineer", "As a Staff Software Engineer (IC4),
// you will", "Cisco is seeking a junior UI developer". A level word near a
// role that is not the one hired never counts ("mentor junior engineers",
// "report to a Senior Manager"): the words must follow the hiring itself.
const LEAD_IN = /(?:\b(?:looking for|seeking|hiring|searching for|recruiting|in search of)|^as|\bjoin (?:us|our team|the team) as) (?:an?|our|one) |^as the /gi

const LEVEL_WORD = /^(?:senior|sr|senior-level|lead|junior|jr|entry-level|mid-level|staff|staff-level|principal|principal-level)$/
// Words that tie a level to some other noun ("seeking a partner for senior
// executives") or end the role ("a Senior Engineer to lead the team"). Any
// other words may stand between the article and the level ("a highly
// skilled Lead").
const LINK = /^(?:to|for|with|who|that|in|at|on|of|and|or|from|by|as|the|our|their|your|its)$/
const ROLE = /^(?:engineers?|developers?|analysts?|scientists?|architects?|designers?|consultants?|specialists?|managers?|administrators?|programmers?|technicians?|associates?|professionals?|experts?|sres?|sdes?|testers?|researchers?|writers?|officers?|members?)$/
// "a staff member" is an employee and "a lead generation specialist" sells.
const NOT_A_RANK = /^(?:staff (?:members?|accountants?|nurses?)|lead (?:generation|qualification))$/
const LIST = /^(?:or|to|and|&)$/i

const word = (token = '') => ((token.match(/[A-Za-z][A-Za-z-]*/) || [''])[0]).toLowerCase()

// The role's words, from its level word to its last noun ("Senior Associate
// Data Scientist", "Principal Member of Technical Staff"), or null.
function roleAfter(tokens) {
  const words = tokens.map(word)
  let i = 0
  while (i < 3 && words[i] && !LEVEL_WORD.test(words[i]) && !LINK.test(words[i])) i++
  if (!LEVEL_WORD.test(words[i] || '') || tokens[i].includes('/') || LIST.test(tokens[i + 1] || '')) return null
  if (NOT_A_RANK.test(`${words[i]} ${words[i + 1]}`)) return null
  let to = 0
  for (let j = i + 1; j <= i + 6 && j < tokens.length; j++) {
    // A clause ends at a comma ("As a Lead, you will mentor engineers"), and
    // "and" after the noun starts another role.
    if (/[,;:]$/.test(tokens[j - 1]) || (to && (j > to + 3 || LEVEL_WORD.test(words[j])))) break
    if (LINK.test(words[j]) && (to || words[j] !== 'and')) break
    if (ROLE.test(words[j])) to = j + 1
  }
  if (to && /^members?$/.test(words[to - 1]) && /^of technical staff\b/i.test(tokens.slice(to, to + 3).join(' '))) to += 3
  return to ? { from: i, to } : null
}

// [{ level, evidence, rule }] for every hiring statement that names a level,
// from units of { text, section, wished }. The role's words are read by the
// title rules, so "a Senior Solutions Architect" is read here as its title
// would be.
export function rolesIn(units) {
  const found = []
  for (const { text: sentence } of units) {
    for (const m of sentence.matchAll(LEAD_IN)) {
      const start = m.index + m[0].length
      const tokens = sentence.slice(start).split(/\s+/).slice(0, 12)
      const role = roleAfter(tokens)
      const level = role && titleSays(tokens.slice(role.from, role.to).join(' '))?.level
      if (!level || level === 'internship' || negated(sentence.slice(0, m.index))) continue
      const said = tokens.slice(0, role.to).join(' ').replace(/[^A-Za-z]+$/, '')
      if (namesOthers(sentence.slice(0, start) + sentence.slice(start + said.length), level)) continue
      found.push({ level, evidence: saying(sentence, m.index, start + said.length), rule: 'role' })
    }
  }
  return found
}
