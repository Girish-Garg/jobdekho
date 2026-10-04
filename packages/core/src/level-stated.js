import { unitsOf } from './level-guards.js'
import { phrasesIn } from './level-phrases.js'
import { rolesIn } from './level-role.js'
import { fieldsIn } from './level-fields.js'
import { ladderIn } from './level-ladders.js'
import { moreYears } from './level-years-more.js'

// The level a description states in words, read last, when the board, the
// title and the years it asks have said nothing: "This entry-level role is
// designed for recent graduates", "We are looking for a Senior Data
// Engineer", "Level: Senior", a company's own rank, and amounts of
// experience the strict years reader passes over ("at least 3 years of
// relevant experience").
//
// Evidence that disagrees leaves the level unknown, a statement against an
// amount as much as two statements: "the Senior Associate Data Scientist"
// asked for 4 to 7 years is senior by its words and mid by its years, and a
// missed level costs less than a wrong one. When all agree, the hover
// quotes a field the company filled in, or else the first one in the text.
export function statedLevel(description = '', company = '') {
  if (!description) return null
  const units = unitsOf(description, company)
  const years = moreYears(units)
  const said = [...fieldsIn(description), ...ladderIn(description, company),
    ...units.flatMap((unit) => [...phrasesIn([unit]), ...rolesIn([unit])]), ...(years ? [years] : [])]
  if (!said.length || new Set(said.map((s) => s.level)).size > 1) return null
  return said[0]
}
