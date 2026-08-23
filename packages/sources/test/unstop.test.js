import { describe, it, expect } from 'vitest'
import { mapUnstop } from '@jobdekho/sources/boards/unstop.js'

const item = {
  id: 123,
  title: 'Software Development Internship',
  organisation: { name: 'Acme' },
  jobDetail: { type: 'wfh', min_salary: 8000, max_salary: 12000, locations: [] },
  seo_url: 'https://unstop.com/internships/x-123',
  required_skills: [{ skill_name: 'Python' }, { skill_name: 'Django' }],
  updated_at: '2026-06-28T00:00:00Z',
  isPaid: true,
}

describe('mapUnstop', () => {
  it('maps an unstop internship to a RawPosting', () => {
    const r = mapUnstop(item)
    expect(r.externalId).toBe('123')
    expect(r.title).toBe('Software Development Internship')
    expect(r.company).toBe('Acme')
    expect(r.location).toBe('Remote')
    expect(r.url).toBe('https://unstop.com/internships/x-123')
    expect(r.stipend).toBe('Rs 8000 - 12000')
    expect(r.description).toContain('Python')
    expect(r.tags).toEqual(['internship'])
    expect(r.type).toBe('internship')
    expect(r.level).toBe('internship')
    expect(r.experience).toBe('Fresher')
  })
  it('uses listed locations when present and marks unpaid', () => {
    const r = mapUnstop({ id: 1, isPaid: false, jobDetail: { type: 'onsite', locations: [{ name: 'Pune' }] } })
    expect(r.location).toBe('Pune')
    expect(r.stipend).toBe('Unpaid')
  })
  it('maps experience range when min and max differ', () => {
    const r = mapUnstop({ id: 2, jobDetail: { min_experience: 2, max_experience: 4 } })
    expect(r.experience).toBe('2-4 years')
  })
  it('returns Fresher when no experience fields present', () => {
    const r = mapUnstop({ id: 3, jobDetail: {} })
    expect(r.experience).toBe('Fresher')
  })
  it('sets type to job when passed as second argument', () => {
    const r = mapUnstop(item, 'job')
    expect(r.type).toBe('job')
    expect(r.tags).toEqual(['job'])
  })

  // Titles here are bare skill names ("Python Developer"), so only the
  // listing category can tell a job apart from an internship; unlike the
  // internship branch, a job must not carry an inferred level.
  it('leaves level unset for a job so the title-based classifier decides', () => {
    const r = mapUnstop(item, 'job')
    expect(r.level).toBeUndefined()
  })
})
