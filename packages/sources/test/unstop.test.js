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
  })
  it('uses listed locations when present and marks unpaid', () => {
    const r = mapUnstop({ id: 1, isPaid: false, jobDetail: { type: 'onsite', locations: [{ name: 'Pune' }] } })
    expect(r.location).toBe('Pune')
    expect(r.stipend).toBe('Unpaid')
  })
})
