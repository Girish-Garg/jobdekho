import { describe, it, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { WEIGHTS, levelScoreTable, skillPatternSource } from '@jobdekho/core/score.js'
import { levelsForYears } from '@jobdekho/core/profile.js'
import { scoreColumn, canRank } from '@jobdekho/db/posting-score.js'

const dialect = new PgDialect()
const render = (col) => dialect.sqlToQuery(col)

describe('canRank', () => {
  // Everything would score identically, so "Recommended" would just shuffle
  // the feed rather than rank it.
  it('refuses to rank an empty profile', () => {
    expect(canRank({})).toBe(false)
    expect(canRank(null)).toBe(false)
    expect(canRank(undefined)).toBe(false)
  })

  it('ranks once the profile carries a skill', () => {
    expect(canRank({ skills: ['react'] })).toBe(true)
  })

  // 0 is a stated answer ("no experience yet"), not the "nothing to rank on"
  // case that an omitted years field is.
  it('ranks on years alone, including zero', () => {
    expect(canRank({ years: 0 })).toBe(true)
  })
})

describe('scoreColumn', () => {
  it('emits one CASE branch per profile skill rather than one for the whole list', () => {
    const { sql, params } = render(scoreColumn({ skills: ['react', 'node', 'python'] }))
    // Each skill's branch checks title first, then body: two regex tests per skill.
    expect((sql.match(/~\*/g) || []).length).toBe(6)
    expect(params.filter((p) => p === WEIGHTS.titleSkill)).toHaveLength(3)
    expect(params.filter((p) => p === WEIGHTS.bodySkill)).toHaveLength(3)
  })

  // Mutating the shared constant and checking the rendered SQL follows it is
  // what actually distinguishes "reads WEIGHTS" from "copied the numbers in" -
  // a hardcoded 8 would not move when WEIGHTS.titleSkill does.
  it('reads titleSkill and bodySkill from core.WEIGHTS instead of a hardcoded copy', () => {
    const originalTitle = WEIGHTS.titleSkill
    const originalBody = WEIGHTS.bodySkill
    WEIGHTS.titleSkill = 991
    WEIGHTS.bodySkill = 992
    try {
      const { params } = render(scoreColumn({ skills: ['react'] }))
      expect(params).toContain(991)
      expect(params).toContain(992)
    } finally {
      WEIGHTS.titleSkill = originalTitle
      WEIGHTS.bodySkill = originalBody
    }
  })

  it('reads degreeFit from core.WEIGHTS instead of a hardcoded copy', () => {
    const original = WEIGHTS.degreeFit
    WEIGHTS.degreeFit = 777
    try {
      const { params } = render(scoreColumn({}))
      expect(params).toContain(777)
    } finally {
      WEIGHTS.degreeFit = original
    }
  })

  // The lookup CASE has to contain exactly the points core's levelScoreTable
  // computes for this profile's years, or the two scorers rank differently
  // the moment someone tunes the level curve in one place only.
  it('builds the level lookup from core.levelScoreTable rather than reimplementing the rungs', () => {
    const wanted = levelsForYears(2)
    const table = levelScoreTable(wanted)
    const { params } = render(scoreColumn({ years: 2 }))
    for (const points of Object.values(table)) expect(params).toContain(points)
  })

  it('adds no level branch when years is unstated, since nothing is ruled in or out', () => {
    const { sql } = render(scoreColumn({}))
    expect(sql.toLowerCase()).not.toContain('coalesce("level"')
  })

  // The pattern has to come from core rather than be rebuilt here, or this SQL
  // and scorePosting() drift on what counts as a match. A substring match was
  // the old rule, and under it the skill "c" scored every posting in the table.
  it('binds the pattern core builds, bounded on both word-character edges', () => {
    const { params } = render(scoreColumn({ skills: ['react'] }))
    expect(params).toContain(skillPatternSource('react', '\\y', '\\y'))
    expect(params).toContain('\\yreact\\y')
  })

  // A boundary on a symbol edge could never match: "c++" is followed by a
  // space, and \y needs a word to non-word transition to fire. Core decides
  // which edges get one; this pins that the SQL side gets the same answer.
  it('leaves the boundary off an edge that is not a word character', () => {
    const { params } = render(scoreColumn({ skills: ['c++', '.net', 'node.js'] }))
    expect(params).toContain('\\yc\\+\\+')
    expect(params).toContain('\\.net\\y')
    expect(params).toContain('\\ynode\\.js\\y')
  })

  // Unescaped, the "+" of "c++" is a quantifier and the "." of ".net" matches
  // any character, so both would match far more than the literal skill.
  it('escapes regex metacharacters inside a skill', () => {
    const { params } = render(scoreColumn({ skills: ['100% remote'] }))
    expect(params).toContain('\\y100% remote\\y')
    expect(params.some((p) => String(p).includes('c++'))).toBe(false)
  })
})

// An empty profile is exactly what canRank exists to catch, and it was letting
// one through: normalizeProfile turned the API's null years into 0, so a user
// with nothing saved got the feed reordered around a phantom fresher profile.
describe('canRank on the profile the API actually returns', () => {
  it('refuses to rank a profile with no skills and no stated years', () => {
    expect(canRank({ skills: [], titles: [], locations: [], years: null, degree: 'none' })).toBe(false)
  })

  it('still ranks a profile that states zero years', () => {
    expect(canRank({ skills: [], years: 0 })).toBe(true)
  })
})
