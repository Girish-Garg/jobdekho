import { describe, it, expect } from 'vitest'
import { rolesIn } from '@jobdekho/core/level-role.js'

const unit = (text) => ({ text, section: 'req', wished: false })
const read = (sentence) => rolesIn([unit(sentence)]).map(({ level, evidence }) => ({ level, evidence }))
const levels = (sentence) => rolesIn([unit(sentence)]).map((s) => s.level)

describe('rolesIn', () => {
  it('reads the role a posting hires for, with its level word', () => {
    expect(read('We are looking for a Senior Data Engineer to support the Data Engineering ecosystem.'))
      .toEqual([{ level: 'senior', evidence: 'Says "We are looking for a Senior Data Engineer"' }])
    expect(read('Cisco Secure Workload is seeking a junior UI/Full Stack developer to assist in developing features.'))
      .toEqual([{ level: 'entry', evidence: 'Says "Cisco Secure Workload is seeking a junior UI/Full Stack developer"' }])
    expect(levels('We are seeking a highly skilled Lead Software Engineer with deep expertise in ServiceNow.')).toEqual(['senior'])
    expect(levels('We are looking for an Entry-Level Full Stack Developer to join our engineering team.')).toEqual(['entry'])
    expect(levels("We're looking for a staff-level fullstack engineer to join a team of highly skilled engineers.")).toEqual(['staff'])
  })

  it('reads "As a <level> <role>, you will"', () => {
    expect(read('As a senior engineer, you will coach L2 teams on advanced troubleshooting techniques.'))
      .toEqual([{ level: 'senior', evidence: 'Says "As a senior engineer"' }])
    expect(read('As a Principal Member of Technical Staff, you will provide technical leadership.'))
      .toEqual([{ level: 'staff', evidence: 'Says "As a Principal Member of Technical Staff"' }])
    expect(read('As the Senior Associate Data Scientist at Amgen, you will build models.'))
      .toEqual([{ level: 'senior', evidence: 'Says "As the Senior Associate Data Scientist"' }])
  })

  // The role's words are read as a title would be, so the chip and the fit
  // cannot read one role two ways.
  it('reads the role by the title rules', () => {
    expect(levels('As a Senior Solutions Architect, you will lead customer designs.')).toEqual(['staff'])
    expect(levels('We are looking for a Principal Presales Engineer / Solutions Architect to join us.')).toEqual(['staff'])
  })

  it('never reads a level near a role that is not the one hired', () => {
    expect(read('You will mentor junior engineers and report to a Senior Manager.')).toEqual([])
    expect(read('Partner with senior engineers across the platform.')).toEqual([])
    expect(read('We are hiring a lot of senior engineers this year.')).toEqual([])
    expect(read('We are seeking a partner for senior executives in the region.')).toEqual([])
  })

  it('never reads a negated hire', () => {
    expect(read('We are not looking for a Senior Engineer for this team.')).toEqual([])
  })

  it('never reads a list or a range of levels', () => {
    expect(read('As a Senior/Principal AI Engineer, you will drive GenAI delivery.')).toEqual([])
    expect(read('We are looking for a Senior or Staff Engineer to own the platform.')).toEqual([])
    expect(read('We are hiring a Senior Engineer and a Junior Developer.')).toEqual([])
  })

  it('never reads an employee, a sales lead or a clause that ended', () => {
    expect(read('As a staff member, you will support the clinic.')).toEqual([])
    expect(read('We are looking for a Lead Generation Specialist to grow the pipeline.')).toEqual([])
    expect(read('As a lead, you will mentor engineers.')).toEqual([])
  })

  it('never reads a hire with no level word', () => {
    expect(read('We are looking for an experienced Software Engineer (Qt/QML) to join the team.')).toEqual([])
    expect(read('We are seeking an Associate to join our operations team.')).toEqual([])
  })
})
