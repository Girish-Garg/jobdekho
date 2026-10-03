import { describe, it, expect } from 'vitest'
import { titleSays, titleEvidence, spaced } from '@jobdekho/core/title-rules.js'
import { titleLevel } from '@jobdekho/core/title-level.js'
import { classifyLevel } from '@jobdekho/core/level.js'

const level = (title) => titleSays(title)?.level ?? null

describe('titleSays', () => {
  // "_" separates words on some boards and hid every word from the rules.
  it('reads "_" as a space', () => {
    expect(spaced('IN_Senior Associate_Azure')).toBe('IN Senior Associate Azure')
    expect(level('Interim Engineering Intern_2027_SW')).toBe('internship')
    expect(level('IN_Senior Associate_Azure Data Engineer_GCC_Advisory_Mumbai')).toBe('senior')
    expect(level('Internal_Tools_Engineer')).toBeNull()
  })

  it('reads the internship words, plurals included, and nothing that merely starts like them', () => {
    for (const title of ['Data Interns', 'Summer Internships', 'Apprentices - Ops', 'Co-op Engineer', 'Industrial Training', 'Summer Analyst']) {
      expect(level(title)).toBe('internship')
    }
    expect(level('International Sales Engineer')).toBeNull()
  })

  // In India a Graduate Engineer Trainee is a full-time first job.
  it('reads Trainee, Traineeship, GET and PGET as entry, and says so', () => {
    expect(titleSays('Graduate Engineer Trainee')).toMatchObject({ level: 'entry', rule: 'trainee' })
    expect(titleSays('TTT GET Design Engineer')).toMatchObject({ level: 'entry', rule: 'trainee' })
    expect(titleSays('PGET - Process')).toMatchObject({ level: 'entry', rule: 'trainee' })
    expect(titleSays('Traineeship in Finance')).toMatchObject({ level: 'entry', rule: 'trainee' })
    // "Get" opening a title is a verb, not a rank.
    expect(level('Get Started Engineer')).toBeNull()
  })

  it('reads freshers, fresh graduates and SSE', () => {
    expect(level('Full Stack Developer - Freshers - Onsite')).toBe('entry')
    expect(level('Fresh Graduates Programme Analyst')).toBe('entry')
    expect(level('SSE - Full Stack')).toBe('senior')
    expect(level('Fresh Produce Buyer')).toBeNull()
  })

  // Banks rank individual contributors as VP and AVP.
  it('reads a bank VP or AVP on an engineer as senior, and keeps real executives', () => {
    expect(titleSays('VP Software Engineer, FIC Sales Technology')).toMatchObject({ level: 'senior', rule: 'bank-vp' })
    expect(level('Java Developer - AVP')).toBe('senior')
    expect(level('Core Java Backend Developer - Assistant Vice President')).toBe('senior')
    expect(level('VP - Data Architect - Corporate Data Technology')).toBe('staff')
    expect(level('VP of Engineering')).toBe('executive')
    expect(level('Director, Software Engineering')).toBe('executive')
    expect(level('Head of Data Engineer Hiring')).toBe('executive')
  })

  it('reads a rank before a bracket or a dash', () => {
    expect(level('SDE I (UI)')).toBe('entry')
    expect(level('Engineer II - Data')).toBe('mid')
    expect(level('SDE III -Backend')).toBe('senior')
    expect(level('Software Engineer 3 (Fullstack)')).toBe('senior')
    expect(level('Software Engineer - Team 1')).toBeNull()
  })

  // "SDE 2 Infra" is rung two; "Engineer 4-7 yrs" asks for years.
  it('reads a rank right after the role noun, never a number of years', () => {
    expect(level('SDE 2 Infra')).toBe('mid')
    expect(level('Data Engineer (SDE 2)')).toBe('mid')
    expect(level('Engineer II Product Design')).toBe('mid')
    expect(level('C++ Software Engineer 4-7 yrs')).toBeNull()
    expect(level('IC Package design engineer- 4+ Years')).toBeNull()
    expect(level('Developer 3D Graphics')).toBeNull()
  })

  it('reads Intermediate and Mid Level as mid', () => {
    expect(level('Intermediate Backend Engineer, India')).toBe('mid')
    expect(level('Axway MFT - Mid level Consultant')).toBe('mid')
    expect(level('Intermediate')).toBe('mid')
    expect(level('Midlands Sales Rep')).toBeNull()
  })

  it('names its words as evidence', () => {
    expect(titleEvidence(titleSays('Sr. System Engineer'))).toBe('Title says Sr')
    expect(titleEvidence(titleSays('Software Engineer II'))).toBe('Title rank II')
    expect(titleEvidence(titleSays('Data Engineer, AVP'))).toBe('Title says AVP, a bank rank')
  })
})

// The chip and the fit read one rule set; they once disagreed on 59 titles.
describe('the chip and the fit', () => {
  it('read every title the same way', () => {
    const titles = ['Associate Product Manager', 'SDE III -Backend', 'Graduate Engineer Trainee', 'Software Engineer VP',
      'IN_Manager_ GCP Devops Engineer', 'Intermediate Support Engineer', 'Software Engineer', 'Staff Engineer']
    for (const title of titles) expect(titleLevel(title)?.level ?? null).toBe(classifyLevel(title))
  })
})
