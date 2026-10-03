import { describe, it, expect } from 'vitest'
import { postingSections } from '@jobdekho/core/jd-layout.js'

const kinds = (sections) => sections.map((s) => [s.kind, s.heading, s.boilerplate])

const AD = [
  'You will join the payments team as a backend engineer.',
  'About Acme',
  'Acme is a leading provider of payment rails.',
  'Requirements:',
  '- 3+ years of Go',
  '- Kafka',
  'What you will do',
  '- Build APIs',
  'Benefits',
  '- Health cover',
  'Acme is an equal opportunity employer and hires without regard to race or religion.',
  'Nice to have:',
  '- Rust',
  'How to apply',
  'Send your CV to jobs@acme.com',
].join('\n')

describe('postingSections', () => {
  it('lays a posting out in reading order after its opening summary', () => {
    const got = postingSections(AD, { company: 'Acme' })
    expect(kinds(got)).toEqual([
      ['other', null, false],
      ['duties', 'What you will do', false],
      ['requirements', 'Requirements', false],
      ['nice', 'Nice to have', false],
      ['pay', 'Benefits', false],
      ['apply', 'How to apply', false],
      ['about', 'About Acme', false],
      ['other', null, true],
    ])
    expect(got[2].lines).toEqual(['- 3+ years of Go', '- Kafka'])
  })

  // Equal-opportunity text folds under "Show company text"; it is never deleted.
  it('flags equal-opportunity text as boilerplate wherever it sits', () => {
    const eeo = postingSections(AD, { company: 'Acme' }).at(-1)
    expect(eeo.lines).toEqual(['Acme is an equal opportunity employer and hires without regard to race or religion.'])
  })

  // Template text folds only out of company copy, never out of what the job asks.
  it('flags company template lines outside what the job asks and does', () => {
    const isTemplate = (line) => /Acme is a leading provider|Health cover|3\+ years of Go/.test(line)
    const got = postingSections(AD, { company: 'Acme', isTemplate })
    expect(got.find((s) => s.kind === 'about').boilerplate).toBe(true)
    expect(got.find((s) => s.kind === 'pay').boilerplate).toBe(true)
    expect(got.find((s) => s.kind === 'requirements').boilerplate).toBe(false)
  })

  it('reads the company pitch before any heading as about the company', () => {
    const got = postingSections('Acme is a leading provider of payment rails.\nResponsibilities\n- Build APIs', { company: 'Acme' })
    expect(kinds(got)).toEqual([['duties', 'Responsibilities', false], ['about', null, false]])
  })

  // "Experience with Kafka" opens like a heading and is a bullet.
  it('does not take a bullet for a heading', () => {
    const got = postingSections('Requirements\nExperience with Kafka and Redis\nSkills\nGo', {})
    expect(kinds(got)).toEqual([['requirements', 'Requirements', false], ['requirements', 'Skills', false]])
    expect(got[0].lines).toEqual(['Experience with Kafka and Redis'])
  })

  // A posting with no headings keeps the layout it has.
  it('is null for a text with no heading at all', () => {
    expect(postingSections('Build APIs in Go.\nShip weekly.')).toBeNull()
    expect(postingSections('')).toBeNull()
  })
})
