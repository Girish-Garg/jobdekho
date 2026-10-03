import { describe, it, expect } from 'vitest'
import { programmeIn } from '@jobdekho/core/programme.js'

const says = (text) => programmeIn(text)?.match ?? null

describe('programmeIn', () => {
  it('reads a statement that this job is a programme', () => {
    expect(says('This is an on-site internship role for a Frontend Developer.')).toBe('This is an on-site internship')
    expect(says('Type: Paid, remote internship')).toBe('Paid, remote internship')
    expect(says('Note: This is a unpaid internship.')).toBe('This is a unpaid internship')
    expect(says('About the internship\n\nYou will build dashboards.')).toBe('About the internship')
    expect(says('Internship duration: 6 months')).toBe('Internship duration')
    expect(says('Intern position based in Pune.')).toBe('Intern position')
    expect(says('A 6-month internship in Pune.')).toBe('6-month internship')
    expect(says('We are hiring an intern for our data team.')).toBe('hiring an intern')
  })

  // What the candidate did before is not what the job is.
  it('never reads a list of where experience may come from', () => {
    expect(says('1-3 years of experience or strong internship/projects in ML')).toBeNull()
    expect(says("Associate's Degree or Apprenticeship in Computer Science")).toBeNull()
    expect(says('Exposure through coursework or internship.')).toBeNull()
    expect(says('Prior internship experience with SQL.')).toBeNull()
    expect(says('Academic, certification, internship, or personal projects.')).toBeNull()
  })

  // "Intern Position: https://..." points at a different posting.
  it('does not read a link to another posting', () => {
    expect(says('Intern Position: https://www.supero.dev/careers/software-engineer-intern/')).toBeNull()
  })

  it('reads "N-month internship" and "hiring an intern" only outside the qualifications', () => {
    expect(says('Requirements:\n- Completed a 6-month internship in analytics')).toBeNull()
    expect(says('Qualifications:\n- Experience as an intern at a startup')).toBeNull()
    expect(says('Requirements:\n- This is a paid internship for six months')).toBe('This is a paid internship')
  })

  // Culture blurbs talk about the company's programmes in general.
  it('skips benefits and equal opportunity copy', () => {
    expect(says('Benefits:\n- A 3-month internship programme for your family')).toBeNull()
    expect(says('Equal Opportunity:\n- We run a paid internship for veterans')).toBeNull()
  })

  it('says nothing for a description with no such word', () => {
    expect(programmeIn('Build services in Go.')).toBeNull()
    expect(programmeIn('')).toBeNull()
  })
})
