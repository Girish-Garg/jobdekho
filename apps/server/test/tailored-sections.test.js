import { describe, it, expect } from 'vitest'
import { tailoredSections } from '@jobdekho/server/resume/tailored-sections.js'
import { skillRows } from '@jobdekho/server/resume/skill-rows.js'
import { renderTex } from '@jobdekho/server/resume/render.js'

const entries = (...ids) => ids.map((id) => ({ id, title: `Entry ${id}`, organisation: 'Acme', location: '', startDate: '2024', endDate: '', bullets: [`Did ${id}`], tech: [], link: '' }))
const PROFILE = {
  basics: { name: 'Asha Rao' },
  experience: entries('e1', 'e2'), projects: entries('p1', 'p2', 'p3', 'p4', 'p5'),
  education: entries('d1'), certifications: entries('c1'), achievements: entries('a1'),
  skillGroups: [], skills: ['Python', 'React', 'SQL', 'Node.js'],
}
// What a plan looked like when it made the thin resume: one role, one
// project, nothing else.
const THIN = { sections: { experience: [{ id: 'e2', bullets: ['x'] }], projects: [{ id: 'p4', bullets: ['y'] }] }, keywords: { used: ['node.js', 'SQL'] } }

describe('tailoredSections', () => {
  it('keeps every role, degree, certification and achievement, the plan\'s picks first', () => {
    const sections = tailoredSections(PROFILE, THIN)
    expect(sections.experience).toEqual(['e2', 'e1'])
    expect(sections.education).toEqual(['d1'])
    expect(sections.certifications).toEqual(['c1'])
    expect(sections.achievements).toEqual(['a1'])
  })

  it('tops projects up to three, after the ones the plan picked', () => {
    expect(tailoredSections(PROFILE, THIN).projects).toEqual(['p4', 'p1', 'p2'])
    const many = { sections: { projects: entries('p5', 'p3', 'p1', 'p2').map(({ id }) => ({ id })) } }
    expect(tailoredSections(PROFILE, many).projects).toEqual(['p5', 'p3', 'p1', 'p2'])
    expect(tailoredSections({ ...PROFILE, projects: entries('p1') }, { sections: {} }).projects).toEqual(['p1'])
  })

  it('ignores an id the record does not hold', () => {
    expect(tailoredSections(PROFILE, { sections: { experience: [{ id: 'ghost' }] } }).experience).toEqual(['e1', 'e2'])
  })
})

describe('skillRows', () => {
  it('prints the flat skills as one row when the record has no groups, the posting\'s first', () => {
    expect(skillRows({ skills: PROFILE.skills }, ['node.js', 'SQL'])).toEqual([{ name: 'Skills', items: ['SQL', 'Node.js', 'Python', 'React'] }])
  })

  it('keeps named groups, leading each with what the posting asks for', () => {
    const groups = [{ name: 'Languages', items: ['Python', 'Go'] }, { name: 'Empty', items: [] }]
    expect(skillRows({ skillGroups: groups, skills: ['Rust'] }, ['go'])).toEqual([{ name: 'Languages', items: ['Go', 'Python'] }])
  })

  it('is nothing when there are no skills at all', () => {
    expect(skillRows({})).toEqual([])
  })
})

describe('renderTex', () => {
  it('prints a Skills section from the flat list for a record with no groups', () => {
    const tex = renderTex('classic', PROFILE, undefined, { lead: ['React'] })
    expect(tex).toContain(`${String.fromCharCode(92)}resSkillRow{Skills}{React, Python, SQL, Node.js}`)
  })
})
