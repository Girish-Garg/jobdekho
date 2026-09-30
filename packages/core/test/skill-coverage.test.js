import { describe, it, expect } from 'vitest'
import { skillCoverage } from '@jobdekho/core/skill-coverage.js'
import { fitContext } from '@jobdekho/core/fit-context.js'

const ctx = (skills, rarity) => fitContext({ skills }, rarity)
const cover = (jobSkills, skills = ['react', 'node', 'postgres'], rarity, row) => skillCoverage(jobSkills, ctx(skills, rarity), row)

describe('skillCoverage', () => {
  it('is the share of what the job asks that the person holds', () => {
    const all = cover({ react: 'req', node: 'req' })
    const half = cover({ react: 'req', go: 'req' })
    expect(all.value).toBeGreaterThan(half.value)
    expect(half.value).toBeGreaterThan(cover({ go: 'req', rust: 'req' }).value)
  })

  // A title naming one skill is not a perfect match by default.
  it('pulls a posting that names few skills toward a low prior', () => {
    expect(cover({ react: 'req' }).value).toBeLessThan(cover({ react: 'req', node: 'req', postgres: 'req' }).value)
    expect(cover({}).value).toBe(0.25)
  })

  // The old scorer divided by the profile, which capped every job near 60
  // and made learning a skill lower every score.
  it('does not dilute a match when the profile lists more skills', () => {
    const job = { react: 'title' }
    expect(cover(job, ['react']).value).toBe(cover(job, ['react', 'go', 'rust', 'scala', 'kotlin']).value)
  })

  it('weighs a skill by where the ad named it', () => {
    const inTitle = cover({ react: 'title', go: 'req' })
    const inNice = cover({ react: 'nice', go: 'req' })
    expect(inTitle.value).toBeGreaterThan(inNice.value)
  })

  it('lets rarity weigh a matched skill', () => {
    const rarity = (id) => ({ kubernetes: 2, python: 0.5 })[id] ?? 1
    const rare = cover({ kubernetes: 'title' }, ['kubernetes', 'python'], rarity)
    const common = cover({ python: 'title' }, ['kubernetes', 'python'], rarity)
    expect(rare.value).toBeGreaterThan(common.value)
  })

  it('reports skills held, close and missing, heaviest first', () => {
    const got = cover({ react: 'title', 'next.js': 'req', go: 'req', kubernetes: 'resp', graphql: 'nice' })
    expect(got.has.map((h) => h.id)).toEqual(['react'])
    expect(got.close.map((c) => [c.id, c.via])).toEqual([['next.js', 'react']])
    expect(got.missing.map((m) => m.id)).toEqual(['go', 'kubernetes'])
  })

  // "Missing Git" or a nice-to-have is noise on almost any ad.
  it('never lists a generic or optional skill as missing', () => {
    expect(cover({ git: 'req', linux: 'req', graphql: 'nice' }).missing).toEqual([])
  })

  it('matches a skill the table does not know as typed', () => {
    const got = cover({}, ['fortran 77'], undefined, { title: 'Fortran 77 Engineer' })
    expect(got.has).toEqual([{ id: 'fortran 77', where: 'title', w: 2, literal: true }])
    expect(got.value).toBeGreaterThan(0.25)
  })
})
