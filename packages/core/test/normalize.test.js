import { describe, it, expect } from 'vitest'
import { normalize } from '@jobdekho/core/normalize.js'

describe('normalize', () => {
  const raw = {
    externalId: 7, title: '  SDE Intern ', company: ' Acme ',
    location: 'Remote', url: 'https://x/y',
    description: 'Build   things\n\nfast', tags: ['eng'], postedAt: '2026-06-01',
    stipend: '₹ 10,000 /month', duration: '3 Months', experience: 'Fresher',
  }
  it('produces a canonical posting with id and trimmed fields', () => {
    const p = normalize(raw, 'greenhouse:acme')
    expect(p.source).toBe('greenhouse:acme')
    expect(p.externalId).toBe('7')
    expect(p.title).toBe('SDE Intern')
    expect(p.company).toBe('Acme')
    expect(p.descriptionSnippet).toBe('Build things fast')
    expect(p.id).toMatch(/^[0-9a-f]{16}$/)
    expect(p.stipend).toBe('₹ 10,000 /month')
    expect(p.duration).toBe('3 Months')
    expect(p.experience).toBe('Fresher')
  })
  it('fills safe defaults for missing optional fields', () => {
    const p = normalize({ externalId: '1', title: 'T', company: 'C', url: 'u' }, 's')
    expect(p.location).toBe('')
    expect(p.tags).toEqual([])
    expect(p.postedAt).toBeNull()
    expect(p.stipend).toBeNull()
    expect(p.duration).toBeNull()
    expect(p.experience).toBeNull()
    expect(p.type).toBe('job')
  })
  it('classifies level and degree, and derives type from level', () => {
    const p = normalize(raw, 'greenhouse:acme')
    expect(p.level).toBe('internship')
    expect(p.type).toBe('internship')
    expect(p.degreeMin).toBe('none')
    expect(p.degreeRequired).toBe(false)
  })
  it('prefers a level the source already knows', () => {
    const p = normalize({ externalId: '1', title: 'Engineer', company: 'C', url: 'u', level: 'internship' }, 's')
    expect(p.level).toBe('internship')
    expect(p.type).toBe('internship')
  })
  it('reads a degree floor from the body past the snippet cutoff', () => {
    const body = `${'padding '.repeat(60)}requires an MS or PhD in Computer Science`
    const p = normalize({ externalId: '1', title: 'Scientist', company: 'C', url: 'u', description: body }, 's')
    expect(p.descriptionSnippet.length).toBe(280)
    expect(p.degreeMin).toBe('masters')
  })
})
