import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderTex } from '@jobdekho/server/resume/render.js'

const golden = (name) => readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8')

// The bullet carries the same injection attempt escape.js is tested against
// on its own: rendering it end to end through a real template is what proves
// the whole pipeline, not just the escaper in isolation, keeps it inert.
const fixtureProfile = {
  basics: {
    name: 'Jane Doe', headline: 'Backend Engineer', email: 'jane@example.com', phone: '',
    location: 'Pune', links: { github: 'github.com/janedoe', linkedin: '', portfolio: '' },
  },
  experience: [{
    id: 'e1', order: 0, title: 'Engineer', organisation: 'Acme', location: '',
    startDate: '2022', endDate: 'Present',
    bullets: ['Shipped 100% \\newcommand{\\x}{pwned} of the roadmap'],
    tech: ['node'], link: '', pinned: false, weight: 0,
  }],
  projects: [], education: [], certifications: [], achievements: [],
  skillGroups: [{ id: 'g1', order: 0, name: 'Languages', items: ['JavaScript'] }],
}

describe('renderTex', () => {
  it('renders the classic template byte-for-byte against the golden fixture', () => {
    expect(renderTex('classic', fixtureProfile, {})).toBe(golden('resume-golden-classic.tex'))
  })

  it('throws on an unknown template id rather than reading a nonexistent file', () => {
    expect(() => renderTex('nope', fixtureProfile, {})).toThrow(/unknown resume template/)
  })

  it('falls back to a placeholder name so an unfilled profile still compiles to something', () => {
    const empty = { basics: {}, experience: [], projects: [], education: [], certifications: [], achievements: [], skillGroups: [] }
    expect(renderTex('classic', empty, {})).toContain('\\resHeader{Your Name}')
  })

  it('honours a selection that reorders and drops entries', () => {
    const twoJobs = {
      ...fixtureProfile,
      experience: [
        ...fixtureProfile.experience,
        { id: 'e2', order: 1, title: 'Junior Engineer', organisation: 'Old Co', location: '', startDate: '2020', endDate: '2022', bullets: [], tech: [], link: '', pinned: false, weight: 0 },
      ],
    }
    const tex = renderTex('classic', twoJobs, { experience: ['e2'] })
    expect(tex).toContain('Junior Engineer')
    // The excluded entry's own header call, not a substring match: "Engineer"
    // alone would also match inside "Junior Engineer".
    expect(tex).not.toContain('{Engineer}{Acme}')
  })

  it('renders every known template without throwing', () => {
    for (const id of ['classic', 'compact', 'academic']) {
      expect(() => renderTex(id, fixtureProfile, {})).not.toThrow()
    }
  })
})
