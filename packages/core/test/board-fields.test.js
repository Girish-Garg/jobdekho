import { describe, it, expect } from 'vitest'
import { boardOf, storedBoard, boardTypeEvidence } from '@jobdekho/core/board-fields.js'
import { typeTag } from '@jobdekho/core/employment.js'
import { tag } from '@jobdekho/core/tag.js'

describe('boardOf', () => {
  it('keeps what the adapter says the board declared', () => {
    expect(boardOf({ level: 'internship', employment: 'Intern' })).toEqual({ type: 'internship', employment: 'Intern', workMode: null, seniority: null })
    expect(boardOf({ type: 'job', employment: 'Full-time', workMode: 'hybrid' })).toEqual({ type: 'job', employment: 'Full-time', workMode: 'hybrid', seniority: null })
  })

  it('keeps nothing it cannot read', () => {
    expect(boardOf({ type: 'contract', employment: '  ', workMode: 'office' })).toEqual({ type: null, employment: null, workMode: null, seniority: null })
    expect(boardOf(undefined)).toEqual({ type: null, employment: null, workMode: null, seniority: null })
  })
})

// Rows stored before the board's word was kept still carry its list.
describe('storedBoard', () => {
  it('reads the list a stored board posting came from', () => {
    expect(storedBoard({ source: 'internshala', tags: ['internship'] }).type).toBe('internship')
    expect(storedBoard({ source: 'internshala', tags: ['job'] }).type).toBe('job')
    expect(storedBoard({ source: 'unstop', tags: ['internship'], type: 'job' }).type).toBe('internship')
    expect(storedBoard({ source: 'unstop', tags: [], type: 'job' }).type).toBe('job')
    expect(storedBoard({ source: 'instahyre', url: 'https://www.instahyre.com/job-1-sde-internship-at-acme/' }).type).toBe('internship')
    expect(storedBoard({ source: 'instahyre', url: 'https://www.instahyre.com/job-1-sde-at-acme/' }).type).toBe('job')
  })

  it('takes a kept board as it is, and says nothing for other old rows', () => {
    expect(storedBoard({ source: 'linkedin', board: { type: 'job', employment: 'Full-time', workMode: null } }).employment).toBe('Full-time')
    expect(storedBoard({ source: 'greenhouse:stripe', tags: ['internship'] })).toEqual({ type: null, employment: null, workMode: null, seniority: null })
  })
})

describe('boardTypeEvidence', () => {
  it('names the employment type as written, enum spellings made words', () => {
    expect(boardTypeEvidence({ type: 'job', employment: 'FullTime' })).toBe('Employment type: Full Time')
    expect(boardTypeEvidence({ type: 'job', employment: 'full_time' })).toBe('Employment type: full time')
    expect(boardTypeEvidence({ type: 'internship' }, 'unstop')).toBe('Unstop lists it as an internship')
    expect(boardTypeEvidence({ type: 'job' }, 'greenhouse:x')).toBe('The board lists it as a job')
  })
})

describe('typeTag', () => {
  it('follows an internship level, whatever decided it', () => {
    const level = tag('internship', 'title', 'Title says Internship')
    expect(typeTag({ level, board: { type: 'job' } })).toEqual(level)
  })

  it('takes the board filing as a job, and is unknown without one', () => {
    expect(typeTag({ level: tag('senior', 'title', 'Title says Senior'), board: { type: 'job', employment: 'Full-time' } }))
      .toMatchObject({ value: 'job', from: 'board', evidence: 'Employment type: Full-time' })
    expect(typeTag({ level: tag('senior', 'title', 'Title says Senior'), board: { type: null } })).toBeNull()
    expect(typeTag({})).toBeNull()
  })
})
