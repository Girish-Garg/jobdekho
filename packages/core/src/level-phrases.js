import { denies, negated, namesOthers, optionalAt, saying } from './level-guards.js'

// Statements a description makes about the level of the role itself:
// "This entry-level role is designed for recent graduates", "Freshers are
// encouraged to apply", "This is a staff-level role". A level word alone
// says nothing about the job ("mentor junior engineers", "entry-level
// bookkeeping"), so each pattern names the role or the people it is for.
const OPENING = '(?:role|position|job|opportunity|opening)'
const NEWCOMERS = '(?:freshers?|(?:fresh|recent|new) (?:college |university )?grad(?:uate)?s?)'
const EARLY = `(?:${NEWCOMERS}|(?:someone|candidates?|people|individuals?|professionals?|engineers?) (?:who (?:is|are) )?(?:early in (?:their|your|his or her) careers?|at the (?:start|beginning) of (?:their|your) careers?)|early[- ]career (?:professionals?|engineers?|candidates?|talent))`
const RANK = '(entry|junior|mid|intermediate|senior|staff|principal)'
const RANKED = { entry: 'entry', junior: 'entry', mid: 'mid', intermediate: 'mid', senior: 'senior', staff: 'staff', principal: 'staff' }

// [rule, pattern, level]; a null level is the rank word the pattern captured.
const PHRASES = [
  ['level role', `\\b${RANK}[- ]level (?:[\\w-]+ ){0,2}?${OPENING}\\b(?: (?:is )?(?:designed|meant|intended|ideal|suited|perfect|aimed) (?:for|at) (?:[\\w-]+ ){0,2}?(?:graduates?|freshers?|candidates|students|professionals))?`, null],
  ['level expert', `\\bis an? ${RANK}[- ]level (?:[\\w-]+ ){0,3}?(?:expert|professional|contributor|engineer|developer)\\b`, null],
  ['this level role', `\\bthis (?:is an? )?(?:[\\w-]+ )?(senior|junior|staff) ${OPENING}\\b`, null],
  ['hiring at a level', `\\b(?:need|needs|hiring|looking for|seeking)\\b[^.;]{0,60}?\\bat (?:an? |the )?${RANK}[- ](?:experience[- ])?level\\b`, null],
  ['level experience', '\\b(entry|senior)[- ]level (?:experience|expertise|exposure)\\b', null],
  ['newcomers welcome', `\\b${NEWCOMERS}\\b[^.;:!?]{0,80}?\\b(?:are|is|can|may|will be|would be)(?: also| most| very| highly| especially| more than)? (?:welcomed?|encouraged|eligible|invited|considered|apply)\\b(?: to apply)?`, 'entry'],
  ['for early careers', `\\b(?:designed|ideal|perfect|great|excellent|good|suited|suitable|meant|intended|aimed|tailored)(?: \\w+){0,2}? (?:for|at) (?:an? |the )?${EARLY}\\b`, 'entry'],
  ['no experience required', '\\bno (?:prior |previous )?(?:work |professional |industry |relevant )?experience (?:is )?(?:required|needed|necessary)\\b', 'entry'],
  ['start your career', `\\b${OPENING} to (?:start|begin|kick-?start|launch|jump-?start) (?:your|their) careers?\\b`, 'entry'],
  ['early-career role', `\\bthis (?:is an? )?early[- ]career ${OPENING}\\b`, 'entry'],
].map(([rule, source, level]) => ({ rule, re: new RegExp(source, 'id'), level }))

// A rank in a list, or a role the candidate held before ("8 years in a
// systems architecture or principal-level role"), is not this role's.
const LISTED_OR_PAST = /(?:\b(?:in|from|to) an?|\bor|\band|[,/])\s*$/i

// [{ level, evidence, rule }] for every phrase that counts, in text order,
// from units of { text, section, wished }. Experience only wished for
// ("senior-level experience is a plus") never counts, as optional years do
// not.
export function phrasesIn(units) {
  const found = []
  for (const unit of units) {
    const sentence = unit.text
    for (const { re, level: fixed, rule } of PHRASES) {
      const m = re.exec(sentence)
      const level = m && (fixed ?? RANKED[m[1].toLowerCase()])
      if (!level || negated(sentence.slice(0, m.index)) || denies(m[0].replace(/^no /i, '')) || namesOthers(sentence, level)) continue
      if (!fixed && LISTED_OR_PAST.test(sentence.slice(0, m.indices[1][0]))) continue
      if (rule === 'level experience' && optionalAt(unit, m.index)) continue
      found.push({ level, evidence: saying(sentence, m.index, m.index + m[0].length), rule })
    }
  }
  return found
}
