import { describe, it, expect } from 'vitest'
import { SKILLS, SPELLING_ID, PLAIN_ID, SPECIAL, spellings } from '@jobdekho/core/skill-table.js'
import { WEB_SKILLS } from '@jobdekho/core/skill-table-web.js'
import { BACKEND_SKILLS } from '@jobdekho/core/skill-table-backend.js'
import { DATA_SKILLS } from '@jobdekho/core/skill-table-data.js'
import { OPS_SKILLS } from '@jobdekho/core/skill-table-ops.js'

const ROWS = [...WEB_SKILLS, ...BACKEND_SKILLS, ...DATA_SKILLS, ...OPS_SKILLS]

// The table is data many people will add to, so its own consistency is
// checked here rather than trusted: a typo in an implies or a near would
// otherwise fail silently as credit that never arrives.
describe('the skill table', () => {
  it('has one row per id', () => {
    const ids = ROWS.map(([id]) => id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('points every implies, kindOf and near at a skill that exists', () => {
    for (const skill of SKILLS.values()) {
      for (const target of [...skill.implies, ...Object.keys(skill.near)]) {
        expect(SKILLS.has(target), `${skill.id} names ${target}`).toBe(true)
      }
    }
  })

  // Two rows spelling the same word would make the id it reads as depend on
  // the order of the tables.
  it('never gives one spelling to two skills', () => {
    const seen = new Map()
    for (const skill of SKILLS.values()) {
      for (const word of spellings(skill)) {
        expect(seen.get(word) ?? skill.id, `"${word}" is spelled by ${seen.get(word)} and ${skill.id}`).toBe(skill.id)
        seen.set(word, skill.id)
      }
    }
  })

  it('labels every skill for the fit card', () => {
    for (const skill of SKILLS.values()) expect(skill.label.length).toBeGreaterThan(0)
  })

  it('keeps aliases lower case, so a lower-cased lookup finds them', () => {
    for (const word of PLAIN_ID.keys()) expect(word).toBe(word.toLowerCase())
    for (const word of SPELLING_ID.keys()) expect(word).toBe(word.toLowerCase())
  })

  // A replace without the g flag would read only the first mention.
  it('compiles every special alias to read the whole text', () => {
    for (const { re } of SPECIAL) expect(re.flags).toContain('g')
  })

  it('makes a variant imply what it is a variant of', () => {
    expect(SKILLS.get('mysql').implies).toContain('sql')
    expect(SKILLS.get('mysql').kindOf).toBe('sql')
  })
})
