import { describe, it, expect } from 'vitest'
import { upsertProfile, toProfile } from '@jobdekho/db/profiles.js'

// Records what an upsert would write, and answers .returning() with the row
// the database would hold afterwards, so a test can assert on both the SET
// clause and what the caller is handed back.
function fakeDb(stored = {}) {
  const calls = {}
  const chain = {
    insert: () => chain,
    values: (v) => { calls.values = v; return chain },
    onConflictDoUpdate: (cfg) => { calls.set = cfg.set; return chain },
    returning: async () => [{ ...stored, ...calls.values }],
  }
  return { db: chain, calls }
}

const HAND_EDIT = { skills: ['react'], titles: ['frontend developer'], years: 2, degree: 'bachelors' }

describe('upsertProfile', () => {
  // The bug this exists for: every column was written on every upsert, and the
  // profile form deliberately sends no resume fields, so saving hand-edited
  // skills erased an uploaded resume. That is the only input the cover letter
  // and resume tailoring features have.
  it('leaves the resume alone when the caller sends no resume fields', async () => {
    const { db, calls } = fakeDb({ resumeText: 'the stored resume', resumeName: 'cv.pdf' })
    await upsertProfile(db, 'u1', HAND_EDIT)
    expect(Object.keys(calls.set)).not.toContain('resumeText')
    expect(Object.keys(calls.set)).not.toContain('resumeName')
    expect('resumeText' in calls.values).toBe(false)
  })

  it('reports the resume the database still holds, not the absence it was sent', async () => {
    const { db } = fakeDb({ resumeText: 'the stored resume', resumeName: 'cv.pdf' })
    const saved = await upsertProfile(db, 'u1', HAND_EDIT)
    expect(saved.resumeName).toBe('cv.pdf')
    expect(saved.skills).toEqual(['react'])
  })

  it('writes the resume when the caller does carry one', async () => {
    const { db, calls } = fakeDb()
    await upsertProfile(db, 'u1', { ...HAND_EDIT, resumeText: 'fresh text', resumeName: 'new.pdf' })
    expect(calls.values.resumeText).toBe('fresh text')
    expect(Object.keys(calls.set)).toContain('resumeText')
  })

  // Membership, not truthiness: a caller that means to clear the resume has to
  // be able to, and null is how it says so.
  it('clears the resume on an explicit null', async () => {
    const { db, calls } = fakeDb({ resumeText: 'old', resumeName: 'old.pdf' })
    await upsertProfile(db, 'u1', { ...HAND_EDIT, resumeText: null, resumeName: null })
    expect(calls.values.resumeText).toBeNull()
    expect(Object.keys(calls.set)).toContain('resumeText')
  })

  it('still normalizes the profile fields it does write', async () => {
    const { db, calls } = fakeDb()
    await upsertProfile(db, 'u1', { skills: ['React', 'react', ''], years: 'abc', degree: 'bootcamp' })
    expect(calls.values.skills).toEqual(['react'])
    expect(calls.values.years).toBeNull()
    expect(calls.values.degree).toBe('none')
  })
})

describe('toProfile', () => {
  it('drops the bookkeeping a caller has no use for', () => {
    const p = toProfile({ skills: ['go'], years: 3, degree: 'masters', resumeName: 'cv.pdf', updatedAt: new Date() })
    expect(p).toEqual({ skills: ['go'], titles: [], locations: [], years: 3, degree: 'masters', resumeName: 'cv.pdf' })
  })

  it('answers null for a user with no row', () => {
    expect(toProfile(null)).toBeNull()
  })
})
