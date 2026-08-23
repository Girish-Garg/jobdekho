import { describe, it, expect } from 'vitest'
import { reclassify } from '../src/backfill.js'
import { cleanSnippet, cleanStipend } from '../src/repair.js'

describe('cleanStipend', () => {
  it('undoes the responsive duplicate and keeps the unit', () => {
    expect(cleanStipend('₹ 3,00,000 - 4,50,000 ₹ 3,00,000 - 4,50,000 /year'))
      .toBe('₹ 3,00,000 - 4,50,000 /year')
  })

  it('leaves a single value alone', () => {
    expect(cleanStipend('₹ 8,000 /month')).toBe('₹ 8,000 /month')
    expect(cleanStipend('Unpaid')).toBe('Unpaid')
    expect(cleanStipend(null)).toBeNull()
  })

  // Two different amounts are real data, not a duplicate.
  it('does not merge two unrelated amounts', () => {
    expect(cleanStipend('₹ 5,000 ₹ 9,999')).toBe('₹ 5,000 ₹ 9,999')
  })
})

describe('cleanSnippet', () => {
  const stale = {
    descriptionSnippet: 'Web Development Acme Labs Actively hiring Bangalore ₹ 8,000 /month 3 Months 1. Build the UI.',
    location: 'Bangalore', stipend: '₹ 8,000 /month', duration: '3 Months',
  }

  it('strips the repeated card header from an old snippet', () => {
    expect(cleanSnippet(stale)).toBe('1. Build the UI.')
  })

  it('leaves a already-clean snippet untouched', () => {
    const good = { descriptionSnippet: '1. Build the UI.', location: 'Bangalore', stipend: null, duration: null }
    expect(cleanSnippet(good)).toBe('1. Build the UI.')
  })

  it('tolerates a missing snippet', () => {
    expect(cleanSnippet({})).toBe('')
  })
})

describe('reclassify', () => {
  // Exhaustive on purpose: adding a field here without deciding whether the
  // backfill may legitimately recompute it is how the degree column got wiped.
  it('derives every recomputable field from a stored row', () => {
    expect(reclassify({
      title: 'Senior Data Scientist', company: 'Acme', descriptionSnippet: 'PhD in Statistics',
    })).toEqual({
      descriptionSnippet: 'PhD in Statistics', stipend: undefined, workMode: 'onsite',
      groupKey: 'senior data scientist|acme',
      stipendMin: null, durationMonths: null, experienceYears: null,
      level: 'senior', type: 'job',
    })
  })

  it('parses the stored measure text into comparable numbers', () => {
    const out = reclassify({
      title: 'X', company: 'C', stipend: '₹ 3,00,000 - 4,50,000 /year',
      duration: '6 Months', experience: 'Fresher',
    })
    expect(out.stipendMin).toBe(25000)
    expect(out.durationMonths).toBe(6)
    expect(out.experienceYears).toBe(0)
  })

  // Internshala titles are bare skill names, so the stored level came from the
  // listing category and is better than anything the title can be read for.
  it('keeps a level the source declared', () => {
    const row = { title: 'Web Development', descriptionSnippet: 'build UI', source: 'internshala', level: 'internship' }
    expect(reclassify(row).level).toBe('internship')
    expect(reclassify(row).type).toBe('internship')
  })

  it('still re-derives the level for sources that never declare one', () => {
    const row = { title: 'Web Development', descriptionSnippet: 'build UI', source: 'greenhouse:acme', level: 'internship' }
    expect(reclassify(row).level).toBe('mid')
  })

  it('derives work mode from the stored location', () => {
    expect(reclassify({ title: 'X', location: 'Work from home' }).workMode).toBe('remote')
    expect(reclassify({ title: 'X', location: 'Gurgaon (Hybrid)' }).workMode).toBe('hybrid')
    expect(reclassify({ title: 'X', location: 'Pune' }).workMode).toBe('onsite')
  })

  // Degree lives in the full description, which is not stored. Recomputing it
  // from the 280-char snippet found 5 requirements where the full text found 290.
  it('never touches degree, which it cannot reconstruct', () => {
    const out = reclassify({ title: 'Scientist', descriptionSnippet: 'PhD in Statistics' })
    expect(out).not.toHaveProperty('degreeMin')
    expect(out).not.toHaveProperty('degreeRequired')
  })

  it('marks internships as such', () => {
    const out = reclassify({ title: 'Software Engineering Intern', descriptionSnippet: 'summer programme' })
    expect(out.level).toBe('internship')
    expect(out.type).toBe('internship')
  })

  it('tolerates an empty snippet', () => {
    expect(reclassify({ title: 'Backend Engineer', company: 'C', descriptionSnippet: '' })).toEqual({
      descriptionSnippet: '', stipend: undefined, workMode: 'onsite',
      groupKey: 'backend engineer|c',
      stipendMin: null, durationMonths: null, experienceYears: null,
      level: 'mid', type: 'job',
    })
  })
})
