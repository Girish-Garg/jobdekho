import { describe, it, expect } from 'vitest'
import { phrasesIn } from '@jobdekho/core/level-phrases.js'

// A sentence as the readers receive it: its text, its section, and whether
// it sits under a Preferred or Nice to have heading.
const unit = (text, wished = false) => ({ text, section: wished ? 'nice' : 'req', wished })
const read = (sentence, wished) => phrasesIn([unit(sentence, wished)]).map(({ level, evidence }) => ({ level, evidence }))
const levels = (sentence) => [...new Set(phrasesIn([unit(sentence)]).map((s) => s.level))]

describe('phrasesIn: a role named by its level', () => {
  it('reads entry, mid, senior and staff level roles, with their words', () => {
    expect(read('This entry-level role is designed for recent graduates passionate about quality.'))
      .toContainEqual({ level: 'entry', evidence: 'Says "This entry-level role is designed for recent graduates"' })
    expect(read('This is an entry level position and will be compensated accordingly.'))
      .toEqual([{ level: 'entry', evidence: 'Says "This is an entry level position"' }])
    expect(levels('This senior-level engineering position requires a basic understanding of refrigerants.')).toEqual(['senior'])
    expect(levels('This is a staff-level role: we are hiring a technical leader, not just a strong individual contributor.')).toEqual(['staff'])
    expect(levels('The Applications Development Programmer Analyst is an intermediate level position.')).toEqual(['mid'])
  })

  it('reads "is a <level>-level" said of the role', () => {
    expect(levels('The Associate DevOps Engineer is an entry level subject matter expert.')).toEqual(['entry'])
    expect(levels('The Specialist is a senior-level individual contributor with deep expertise.')).toEqual(['senior'])
  })

  it('reads "this is a senior role" and "this junior position"', () => {
    expect(read('This is a senior role which requires deep ownership.')).toEqual([{ level: 'senior', evidence: 'Says "This is a senior role"' }])
    expect(levels('Reporting to the lead, this junior position suits a quick learner.')).toEqual(['entry'])
  })

  it('reads a hiring need at a stated level', () => {
    expect(read('ALM, Pune team, need a Software Developer at mid-experience level who will work on several products.'))
      .toEqual([{ level: 'mid', evidence: 'Says "need a Software Developer at mid-experience level"' }])
  })

  it('never reads a negated level', () => {
    expect(read('This is not an entry-level role.')).toEqual([])
    expect(read('This is not a senior role, and it is not junior either.')).toEqual([])
  })

  it('never reads a range or a list of levels', () => {
    expect(read('We hire from entry level to senior roles across the company.')).toEqual([])
    expect(read('We are open to entry-level or mid-level roles.')).toEqual([])
    expect(read('Mentor junior and mid-level engineers on design reviews.')).toEqual([])
  })

  it('never reads a role the candidate held before', () => {
    expect(read('15+ years in software, with 8 years in a technical engineering, systems architecture, or principal-level role.')).toEqual([])
  })

  it('never reads a level word that describes something else', () => {
    expect(read('Assist with entry-level bookkeeping and data entry.')).toEqual([])
    expect(read('Builds, maintains and reviews mid-level unit and component test suites.')).toEqual([])
    expect(read('At a senior level, the role also contributes to platform optimization.')).toEqual([])
  })
})

describe('phrasesIn: experience named by its level', () => {
  it('reads entry-level and senior-level experience asked for', () => {
    expect(read('Entry-level experience with troubleshooting and support in security, network, or storage.'))
      .toEqual([{ level: 'entry', evidence: 'Says "Entry-level experience"' }])
    expect(levels('Have senior-level experience in platform security or cloud security.')).toEqual(['senior'])
  })

  it('never reads it in a list or after a negation', () => {
    expect(read('A degree, or entry-level experience in support.')).toEqual([])
    expect(read('This is not senior-level experience you would gain.')).toEqual([])
  })

  // Experience only wished for never decides a level, as optional years do not.
  it('never reads it when it is only wished for', () => {
    expect(read('Senior-level experience in platform security is a plus.')).toEqual([])
    expect(read('Have senior-level experience in platform security.', true)).toEqual([])
  })
})

describe('phrasesIn: newcomers welcome', () => {
  it('reads freshers and recent graduates welcomed', () => {
    expect(read('Strong freshers are encouraged to apply.')).toEqual([{ level: 'entry', evidence: 'Says "Strong freshers are encouraged to apply"' }])
    expect(levels('fresh graduates are welcome to apply.')).toEqual(['entry'])
    expect(levels('Freshers can apply.')).toEqual(['entry'])
    expect(levels('Fresh graduates or candidates with less than 2 years of working experience are welcome to apply')).toEqual(['entry'])
  })

  it('never reads freshers turned away', () => {
    expect(read('Freshers need not apply.')).toEqual([])
    expect(read('Freshers are not eligible for this role.')).toEqual([])
    expect(read('Freshers will not be considered.')).toEqual([])
  })

  it('never reads newcomers listed with experienced hands', () => {
    expect(read('Freshers and experienced candidates can apply.')).toEqual([])
    expect(read('We hire candidates of all experience levels from recent university graduates through seasoned industry experts.')).toEqual([])
  })
})

describe('phrasesIn: a role for people early in their career', () => {
  it('reads a role designed or ideal for them', () => {
    expect(read('This is an excellent opportunity for a recent graduate or someone with limited work experience to grow.'))
      .toEqual([{ level: 'entry', evidence: 'Says "This is an excellent opportunity for a recent graduate"' }])
    expect(levels('This is an ideal role for someone early in their career who is organized.')).toEqual(['entry'])
    expect(levels('This is an exciting opportunity to start your career in a collaborative environment.')).toEqual(['entry'])
    expect(levels('This is an early-career role in our data team.')).toEqual(['entry'])
  })

  it('never reads company copy that lists every stage of a career', () => {
    expect(read("Whether you're early in your career or an experienced professional, you'll solve complex challenges.")).toEqual([])
    expect(read('Whether you are a professional looking for a career change, an undergraduate student exploring your first opportunity, or recent graduate with an advanced degree, we have opportunities.')).toEqual([])
    expect(read('This role is ideal for someone with strong communication skills.')).toEqual([])
  })
})

describe('phrasesIn: no experience required', () => {
  it('reads it as entry', () => {
    expect(read('No experience required. Typically has a basic knowledge of one or more languages.'))
      .toEqual([{ level: 'entry', evidence: 'Says "No experience required"' }])
    expect(levels('No prior professional experience is required (freshers can apply).')).toEqual(['entry'])
  })

  it('never reads a skill that is not required', () => {
    expect(read('No experience with Kubernetes is required, but 3 years of Go are.')).toEqual([])
  })
})
