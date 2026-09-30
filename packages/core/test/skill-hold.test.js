import { describe, it, expect } from 'vitest'
import { heldSkills, holdingOf } from '@jobdekho/core/skill-hold.js'

describe('heldSkills', () => {
  it('holds a listed skill in full, whatever spelling was typed', () => {
    const { held } = heldSkills(['ReactJS', 'Postgres'])
    expect(held.get('react')).toBe(1)
    expect(held.get('postgres')).toBe(1)
  })

  // A React developer writes JavaScript even without saying so, and Next.js
  // reaches React and then CSS.
  it('holds what a listed skill implies, a little less, all the way down', () => {
    const { held } = heldSkills(['next.js'])
    expect(held.get('next.js')).toBe(1)
    expect(held.get('react')).toBe(0.8)
    expect(held.get('css')).toBe(0.8)
    expect(held.get('javascript')).toBe(0.8)
  })

  it('never lowers a listed skill to implied', () => {
    const { held } = heldSkills(['typescript', 'javascript'])
    expect(held.get('javascript')).toBe(1)
  })

  // Nothing a person listed may stop counting because the table lacks it.
  it('keeps a skill the table does not know as typed', () => {
    const { held, literals } = heldSkills(['Fortran 77', 'python'])
    expect(held.has('python')).toBe(true)
    expect(literals.map((l) => l.text)).toEqual(['Fortran 77'])
    expect(literals[0].re.test('we still run fortran 77')).toBe(true)
  })
})

describe('holdingOf', () => {
  const holds = holdingOf(heldSkills(['react', 'postgres']).held)

  it('reports a held skill in full and an implied one at 0.8', () => {
    expect(holds('react')).toEqual({ value: 1, via: null })
    expect(holds('javascript')).toEqual({ value: 0.8, via: null })
  })

  // Part credit, and which listed skill earned it, for "you know React".
  it('gives part credit through a near link, naming the skill it came through', () => {
    expect(holds('next.js')).toEqual({ value: 0.7, via: 'react' })
    expect(holds('mysql')).toEqual({ value: 0.7, via: 'postgres' })
  })

  it('reports nothing for a skill with no link at all', () => {
    expect(holds('kubernetes')).toEqual({ value: 0, via: null })
  })

  it('gives near credit only through skills actually listed', () => {
    // JavaScript is only implied here, so it lends nothing onward.
    expect(holdingOf(heldSkills(['typescript']).held)('react').value).toBe(0)
  })
})
