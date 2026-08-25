import { describe, it, expect } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import { WEIGHTS, dimensionWeights, levelFitTable } from '@jobdekho/core/score.js'
import { TITLE_CREDIT, BODY_CREDIT, skillPatternSource } from '@jobdekho/core/fit-dimensions.js'
import { HALF_MATCH } from '@jobdekho/core/skill-fit.js'
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

  // A profile naming only a target title is still something to rank against.
  it('ranks on titles alone', () => {
    expect(canRank({ titles: ['backend engineer'] })).toBe(true)
  })

  it('refuses the empty profile shape the API actually returns', () => {
    expect(canRank({ skills: [], titles: [], locations: [], years: null, degree: 'none' })).toBe(false)
  })
})

describe('scoreColumn skills', () => {
  it('emits one CASE branch per profile skill rather than one for the whole list', () => {
    const { sql } = render(scoreColumn({ skills: ['react', 'node', 'python'] }))
    // Two regex tests per skill, title then body, and the whole sum appears
    // twice because the saturating curve is m / (m + k) and SQL has no way to
    // name m once at this level.
    expect((sql.match(/~\*/g) || []).length).toBe(12)
  })

  // Core reads descriptionText and falls back to the snippet when a row
  // predates the column, so the SQL has to coalesce the same pair or the two
  // scorers disagree on every un-rescraped row.
  it('scores the body as description_text with the snippet as fallback', () => {
    const { sql } = render(scoreColumn({ skills: ['react'] }))
    expect(sql).toContain('coalesce("postings"."description_text", "postings"."description_snippet")')
  })

  // With no rarity data every skill weighs 1, so the branch values ARE the
  // credits and the denominator is the skill count: unweighted, not zero.
  it('binds the title and body credits core owns, per skill', () => {
    const { params } = render(scoreColumn({ skills: ['react', 'node'] }))
    expect(params.filter((p) => p === 1 * TITLE_CREDIT).length).toBeGreaterThanOrEqual(2)
    expect(params.filter((p) => p === 1 * BODY_CREDIT)).toHaveLength(4)
  })

  // Saturating, not coverage: the constant is HALF_MATCH and nothing depends
  // on how many skills were listed. Dividing by the profile's own weight total
  // is what capped a 25 skill profile near 60 on every posting.
  it('scales each skill by its rarity weight and saturates on a constant', () => {
    const idf = { react: 2, node: 1.5 }
    const { params } = render(scoreColumn({ skills: ['react', 'node'] }, idf))
    expect(params).toContain(2 * TITLE_CREDIT)
    expect(params).toContain(2 * BODY_CREDIT)
    expect(params).toContain(1.5 * TITLE_CREDIT)
    expect(params).toContain(HALF_MATCH)
    expect(params).not.toContain(3.5)
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
  })
})

describe('scoreColumn titles', () => {
  it('emits one hit test per title token and divides by that title token count', () => {
    const { sql, params } = render(scoreColumn({ titles: ['senior backend engineer'] }))
    expect((sql.match(/~\*/g) || []).length).toBe(2)
    // Stemmed, and opened but not closed: \yengin matches "engineer" and
    // "engineering" alike, which is the whole point of matching a stem as a
    // prefix. A closing \y is what scored "software engineering intern"
    // against "Software Engineer Intern" at half.
    expect(params).toContain('\\ybackend')
    expect(params).toContain('\\yengin')
    expect(params).not.toContain('\\yengineer\\y')
    expect(params).toContain(2)
  })

  // Level is its own dimension; leaving "senior" in the tokens would let one
  // signal count twice. Core's tokeniser decides, this pins the SQL follows.
  it('drops seniority words because level is scored separately', () => {
    const { params } = render(scoreColumn({ titles: ['senior backend engineer'] }))
    expect(params).not.toContain('\\ysenior\\y')
  })

  // The best single alternative decides, exactly like titleFit()'s max.
  it('takes GREATEST over several target titles, but not over one', () => {
    const two = render(scoreColumn({ titles: ['backend engineer', 'data analyst'] }))
    expect(two.sql).toContain('greatest(')
    const one = render(scoreColumn({ titles: ['backend engineer'] }))
    expect(one.sql).not.toContain('greatest(')
  })

  // A title of nothing but stop words has no tokens to match, so no SQL is
  // emitted for it - but the titles weight stays in the denominator, exactly
  // as titleFit() returning 0 leaves the dimension active in JS.
  it('emits no title expression when every token is a stop word, keeping the weight', () => {
    const { sql, params } = render(scoreColumn({ titles: ['senior'] }))
    expect((sql.match(/~\*/g) || []).length).toBe(0)
    expect(params).toContain(WEIGHTS.titles + WEIGHTS.degree)
  })
})

describe('scoreColumn level and degree', () => {
  // The lookup CASE has to contain exactly the fits core's levelFitTable
  // computes for this profile's years, or the two scorers rank differently
  // the moment someone tunes the level curve in one place only.
  it('builds the level lookup from core.levelFitTable rather than reimplementing the rungs', () => {
    const table = levelFitTable(levelsForYears(2))
    const { params } = render(scoreColumn({ years: 2 }))
    for (const [level, fit] of Object.entries(table)) {
      expect(params).toContain(level)
      expect(params).toContain(fit)
    }
  })

  it('adds no level branch when years is unstated, since nothing is ruled in or out', () => {
    const { sql } = render(scoreColumn({ skills: ['react'] }))
    expect(sql.toLowerCase()).not.toContain('coalesce("postings"."level"')
  })
})

describe('scoreColumn composition', () => {
  // Mutating the shared constant and checking the rendered SQL follows it is
  // what actually distinguishes "reads WEIGHTS" from "copied the numbers in" -
  // a hardcoded 45 would not move when WEIGHTS.skills does.
  it('reads the dimension weights from core.WEIGHTS instead of a hardcoded copy', () => {
    const original = { ...WEIGHTS }
    Object.assign(WEIGHTS, { skills: 991, titles: 992, level: 993, degree: 994 })
    try {
      const { params } = render(scoreColumn({ skills: ['react'], titles: ['analyst'], years: 2 }))
      expect(params).toContain(991)
      expect(params).toContain(992)
      expect(params).toContain(993)
      expect(params).toContain(994)
    } finally {
      Object.assign(WEIGHTS, original)
    }
  })

  // An incomplete profile divides by only the dimensions it has, so it can
  // still span 0-100 instead of being capped by what it never stated.
  it('divides by the same dimension total core computes for this profile', () => {
    const skillsOnly = { skills: ['react'] }
    expect(render(scoreColumn(skillsOnly)).params).toContain(dimensionWeights(skillsOnly).total)
    const full = { skills: ['react'], titles: ['analyst'], years: 2 }
    expect(render(scoreColumn(full)).params).toContain(dimensionWeights(full).total)
  })

  // Integer division would floor every fraction to zero; the cast on each
  // denominator is what keeps 2 matched skills out of 3 from scoring as 0.
  it('casts every denominator to float8 and rounds to a 0-100 integer', () => {
    const { sql } = render(scoreColumn({ skills: ['react'], titles: ['data analyst'] }))
    expect(sql.startsWith('round(100 * (')).toBe(true)
    expect((sql.match(/::float8/g) || []).length).toBeGreaterThanOrEqual(3)
  })
})
