import { describe, it, expect } from 'vitest'
import { INSTRUCTION } from '@jobdekho/server/resume/extract-prompt.js'
import { extractProfile } from '@jobdekho/server/resume/extract.js'
import { readExtraction } from '@jobdekho/server/resume/extract-shape.js'
import { fillBasics } from '@jobdekho/server/resume/fill-basics.js'
import { LINKS_HEADING } from '@jobdekho/server/resume/link-appendix.js'
import { CLAUDE } from '@jobdekho/server/ai/providers.js'

const HERE = () => '/usr/local/bin/claude'
const select = async () => CLAUDE

describe('the extraction instruction', () => {
  it('asks for the basics, every field of them', () => {
    expect(INSTRUCTION).toContain('"basics":{"name":"","headline":"","email":"","phone":"","location":"","links":{"github":"","linkedin":"","portfolio":""}}')
  })

  it('asks for certifications, achievements and skill groups as well as the original three', () => {
    for (const key of ['experience', 'projects', 'education', 'certifications', 'achievements', 'skillGroups']) {
      expect(INSTRUCTION).toContain(`"${key}":[`)
      expect(INSTRUCTION).toMatch(new RegExp(`^${key}: `, 'm'))
    }
  })

  it('asks for a link on each job, project, certification and achievement', () => {
    for (const key of ['experience', 'projects', 'certifications', 'achievements']) {
      expect(INSTRUCTION).toMatch(new RegExp(`"${key}":\\[\\{[^\\n]*"link":""`))
    }
    expect(INSTRUCTION).toMatch(/credential URL/)
  })

  it('says where the links are and what to do with one that fits no entry', () => {
    expect(INSTRUCTION).toContain('LINKS IN THE RESUME')
    expect(INSTRUCTION).toMatch(/visible text -> address/)
    expect(INSTRUCTION).toMatch(/never\s+invent/)
    expect(INSTRUCTION).toMatch(/\(on the line: \.\.\.\)/)
    expect(INSTRUCTION).toMatch(/basics\.links\.portfolio only when it is\s+clearly their own personal site, and is left out otherwise/)
  })

  it('keeps the proposals framing and ends on the resume', () => {
    expect(INSTRUCTION).toMatch(/PROPOSALS/)
    expect(INSTRUCTION).toMatch(/include every\s+entry you can find/)
    expect(INSTRUCTION.endsWith('RESUME:\n')).toBe(true)
  })

  it('carries no en or em dash', () => {
    expect(INSTRUCTION).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`))
  })
})

describe('extractProfile with links', () => {
  const sending = () => {
    const seen = {}
    seen.run = async ({ input }) => { seen.input = input; return { stdout: '{"skills":["rust"]}', stderr: '', code: 0 } }
    return seen
  }

  it('hands the links over after the resume text', async () => {
    const seen = sending()
    const links = [{ text: 'Demo video', url: 'https://www.youtube.com/watch?v=demo', line: 'Chess Engine | Demo video' }]
    await extractProfile('Demo Candidate, Chess Engine | Demo video', { links, run: seen.run, locate: HERE, select })
    expect(seen.input.startsWith(INSTRUCTION + 'Demo Candidate, Chess Engine | Demo video')).toBe(true)
    expect(seen.input.indexOf(LINKS_HEADING)).toBeGreaterThan(seen.input.indexOf('Demo Candidate'))
    expect(seen.input).toContain('Demo video -> https://www.youtube.com/watch?v=demo (on the line: Chess Engine | Demo video)')
  })

  it('sends the instruction and the text alone when the PDF had no links', async () => {
    const seen = sending()
    await extractProfile('Demo Candidate, Rust developer', { links: [], run: seen.run, locate: HERE, select })
    expect(seen.input).toBe(INSTRUCTION + 'Demo Candidate, Rust developer')
  })
})

describe('readExtraction', () => {
  it('reads a well-formed reply into what is saved, what fills basics and what is proposed', () => {
    const out = readExtraction({
      skills: ['rust'], titles: ['backend engineer'], locations: ['pune'], years: 2, degree: 'bachelors',
      basics: { name: 'Demo Candidate', email: 'demo@example.com', links: { github: 'https://github.com/demo-candidate' } },
      certifications: [{ title: 'Cloud Practitioner', organisation: 'Demo Cloud', startDate: 'Jan 2024', link: 'https://demo.dev/cert' }],
      achievements: [{ title: 'First place', organisation: 'Demo Hackathon', bullets: ['Out of 400 teams'] }],
      skillGroups: [{ name: 'Languages', items: ['Rust', 'Go'] }],
    })
    expect(out.flat).toEqual({ skills: ['rust'], titles: ['backend engineer'], locations: ['pune'], years: 2, degree: 'bachelors' })
    expect(out.basics).toEqual({
      name: 'Demo Candidate', headline: '', email: 'demo@example.com', phone: '', location: '',
      links: { github: 'https://github.com/demo-candidate', linkedin: '', portfolio: '' },
    })
    expect(out.proposed).toEqual({
      experience: [], projects: [], education: [],
      certifications: [{ title: 'Cloud Practitioner', organisation: 'Demo Cloud', startDate: 'Jan 2024', link: 'https://demo.dev/cert' }],
      achievements: [{ title: 'First place', organisation: 'Demo Hackathon', bullets: ['Out of 400 teams'] }],
      skillGroups: [{ name: 'Languages', items: ['Rust', 'Go'] }],
    })
  })

  it('drops a garbled ranking field on its own and keeps the rest', () => {
    const { flat } = readExtraction({ skills: 'rust, go', titles: ['engineer', 7, null], years: 'lots', degree: 'B.Tech', locations: ['pune'] })
    expect(flat).toEqual({ titles: ['engineer', '7'], locations: ['pune'] })
  })

  it('takes years written as a number in a string, and nothing below zero', () => {
    expect(readExtraction({ years: '3.5' }).flat).toEqual({ years: 3.5 })
    expect(readExtraction({ years: -1 }).flat).toEqual({})
    expect(readExtraction({ years: null }).flat).toEqual({})
  })

  it('drops a wrong field inside an entry without losing the entry', () => {
    const { proposed } = readExtraction({
      projects: [{ title: 'Chess Engine', bullets: 'built it', tech: ['Rust', 3], startDate: 2021, id: 'mine', pinned: true, weight: 9 }],
    })
    expect(proposed.projects).toEqual([{ title: 'Chess Engine', tech: ['Rust', '3'], startDate: '2021' }])
  })

  it('drops entries with nothing to show and lists that are not lists', () => {
    const { proposed } = readExtraction({
      experience: ['Backend Engineer', null, { bullets: ['an orphan bullet'] }, { organisation: 'Demo Labs' }],
      certifications: { title: 'not a list' },
      skillGroups: [{ name: 'Empty', items: [] }, { name: 'Tools', items: 'git' }, { items: ['git', 42, ''] }, 'Rust'],
    })
    expect(proposed.experience).toEqual([{ organisation: 'Demo Labs' }])
    expect(proposed.certifications).toEqual([])
    expect(proposed.skillGroups).toEqual([{ name: '', items: ['git', '42'] }])
  })

  it('keeps web, mail and phone links and drops script or data ones', () => {
    const { basics, proposed } = readExtraction({
      basics: { links: { github: 'javascript:alert(1)', linkedin: 'linkedin.com/in/demo', portfolio: 'data:text/html,hi' } },
      projects: [{ title: 'A', link: 'JavaScript:void(0)' }, { title: 'B', link: 'https://demo.dev/b' }, { title: 'C', link: 'mailto:demo@example.com' }],
    })
    expect(basics.links).toEqual({ github: '', linkedin: 'linkedin.com/in/demo', portfolio: '' })
    expect(proposed.projects).toEqual([{ title: 'A' }, { title: 'B', link: 'https://demo.dev/b' }, { title: 'C', link: 'mailto:demo@example.com' }])
  })

  it('reads basics of the wrong shape as empty, field by field', () => {
    const { basics } = readExtraction({ basics: { name: ['Demo'], phone: 9876543210, links: 'https://github.com/demo' } })
    expect(basics).toEqual({
      name: '', headline: '', email: '', phone: '9876543210', location: '',
      links: { github: '', linkedin: '', portfolio: '' },
    })
  })

  it('reads a reply that is not an object at all as empty', () => {
    for (const reply of [null, [], 'text', 3]) {
      const out = readExtraction(reply)
      expect(out.flat).toEqual({})
      expect(Object.values(out.proposed).every((list) => list.length === 0)).toBe(true)
    }
  })
})

describe('fillBasics', () => {
  const FOUND = {
    name: 'Demo Candidate', headline: 'Backend engineer', email: 'demo@example.com', phone: '', location: 'Pune',
    links: { github: 'https://github.com/demo-candidate', linkedin: '', portfolio: 'https://demo.dev' },
  }

  it('fills only the empty fields and names each one it filled', () => {
    const current = {
      name: 'Demo C.', headline: '', email: '  ', phone: '+91 90000 00000', location: '',
      links: { github: 'https://github.com/typed-by-hand', linkedin: '', portfolio: '' },
    }
    const { basics, filled } = fillBasics(current, FOUND)
    expect(basics).toEqual({
      name: 'Demo C.', headline: 'Backend engineer', email: 'demo@example.com', phone: '+91 90000 00000', location: 'Pune',
      links: { github: 'https://github.com/typed-by-hand', linkedin: '', portfolio: 'https://demo.dev' },
    })
    expect(filled).toEqual(['headline', 'email', 'location', 'links.portfolio'])
  })

  it('fills a profile that has no basics yet', () => {
    const { basics, filled } = fillBasics(undefined, FOUND)
    expect(basics.name).toBe('Demo Candidate')
    expect(basics.links.github).toBe('https://github.com/demo-candidate')
    expect(filled).toEqual(['name', 'headline', 'email', 'location', 'links.github', 'links.portfolio'])
  })

  it('fills nothing when the resume showed nothing', () => {
    expect(fillBasics({ name: '' }, {}).filled).toEqual([])
  })
})
