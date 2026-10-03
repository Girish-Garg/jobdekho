import { describe, it, expect } from 'vitest'
import { internLevel, jobType } from '@jobdekho/sources/providers/employment-type.js'

describe('internLevel', () => {
  it('reads an internship the board states, in its own words', () => {
    expect(internLevel('Intern')).toEqual({ level: 'internship', employment: 'Intern' })
    expect(internLevel('working_student')).toEqual({ level: 'internship', employment: 'working_student' })
    expect(internLevel(null, 'Internship')).toEqual({ level: 'internship', employment: 'Internship' })
  })

  it('says nothing for a job or an empty field', () => {
    expect(internLevel('FullTime')).toEqual({})
    expect(internLevel('', undefined)).toEqual({})
  })
})

// A board-declared full-time job blocks an inferred internship in core.
describe('jobType', () => {
  it('reads full-time, permanent and regular in every spelling boards use', () => {
    expect(jobType('FullTime')).toEqual({ type: 'job', employment: 'FullTime' })
    expect(jobType('Full-time')).toEqual({ type: 'job', employment: 'Full-time' })
    expect(jobType('full_time')).toEqual({ type: 'job', employment: 'full_time' })
    expect(jobType('Full Time Employee')).toMatchObject({ type: 'job' })
    expect(jobType('fulltime_permanent')).toMatchObject({ type: 'job' })
    expect(jobType('Permanent')).toMatchObject({ type: 'job' })
    expect(jobType('Regular')).toMatchObject({ type: 'job' })
  })

  it('leaves contracts, part-time work and silence alone', () => {
    expect(jobType('Contract')).toEqual({})
    expect(jobType('Part-time')).toEqual({})
    expect(jobType(undefined)).toEqual({})
  })

  // "Full-Time Internship" is an internship, as internLevel reads it.
  it('never calls a field with an intern word a job', () => {
    expect(jobType('Full-Time Internship')).toEqual({})
    expect(jobType('Full-time', 'Intern')).toEqual({})
  })
})
