import { describe, it, expect } from 'vitest'
import { skillRarity, flatRarity } from '@jobdekho/core/skill-rarity.js'

const corpus = (counts) => Object.entries(counts).flatMap(([id, n]) => Array.from({ length: n }, () => ({ skills: { [id]: 'req' } })))

describe('skillRarity', () => {
  // Matching Kubernetes says more than matching SQL, which most ads name.
  it('weighs a rare requirement above a common one', () => {
    const rarity = skillRarity(corpus({ sql: 200, python: 50, kubernetes: 6 }))
    expect(rarity('kubernetes')).toBeGreaterThan(rarity('python'))
    expect(rarity('python')).toBeGreaterThan(rarity('sql'))
  })

  it('keeps every weight between a half and double', () => {
    const rarity = skillRarity(corpus({ sql: 5000, go: 5 }))
    for (const id of ['sql', 'go', 'never-seen']) {
      expect(rarity(id)).toBeGreaterThanOrEqual(0.5)
      expect(rarity(id)).toBeLessThanOrEqual(2)
    }
  })

  it('weighs a skill the corpus never named like a typical one', () => {
    expect(skillRarity(corpus({ sql: 20, go: 20 }))('rust')).toBe(1)
  })

  it('reads rows without features as naming nothing', () => {
    expect(() => skillRarity([null, {}, { skills: { go: 'title' } }])).not.toThrow()
  })

  it('weighs everything the same before a corpus is measured', () => {
    expect(flatRarity('anything')).toBe(1)
  })
})
