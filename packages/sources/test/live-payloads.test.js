import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { greenhouse } from '@jobdekho/sources/providers/greenhouse.js'
import { lever } from '@jobdekho/sources/providers/lever.js'
import { ashby } from '@jobdekho/sources/providers/ashby.js'
import { descriptionFromSections } from '@jobdekho/sources/providers/smartrecruiters-detail.js'
import { normalize } from '@jobdekho/core/normalize.js'

// Raw bodies saved from live boards in config/companies.json on 2026-09-30,
// one posting each. The first escaped-tag fix passed on a hand-written
// fixture while the real payloads still leaked, so these assert the text
// that is actually stored: adapter, then normalize().
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'))
const http = (body) => async () => ({ json: async () => body })
const stored = (raw) => normalize(raw, 'test').descriptionText

// Only what prose never says: a closing tag standing as a word, a bare block
// tag, an attribute, an entity, a bracket. "strong" and "span" are English.
const LEAK = /(^|\s)(\/(p|li|ul|div|strong|span|h\d)|p|li|ul|div)(\s|$)|class=|&[a-z#0-9]+;|[<>]/

describe('a live Greenhouse body (escaped HTML)', async () => {
  const [raw] = await greenhouse({ slug: 'hackerrank' }).fetch(http({ jobs: [fixture('greenhouse-hackerrank-job.json')] }))
  const text = stored(raw)

  it('keeps its headings on their own lines with a blank line around them', () => {
    expect(text).toContain('\n\nAbout the team\n\n')
    expect(text).toContain('\n\nWhat you will bring\n\n')
  })

  it('keeps its list as consecutive "- " lines under the heading', () => {
    expect(text).toContain('What you’ll do\n\n- Drive outbound motion ')
    expect(text).toContain('Execute with urgency to grow the business.\n- Develop strong relationships ')
  })

  it('splits <br><br> into paragraphs and decodes the double-escaped ampersand', () => {
    expect(text).toContain("what’s next.\n\nSoftware has entered an era")
    expect(text).toContain('HR, L&D, and technical')
  })

  it('leaks no tag names, attributes or entities', () => {
    expect(text).not.toMatch(LEAK)
  })

  it('still gives a one-line snippet', () => {
    expect(normalize(raw, 'test').descriptionSnippet).not.toContain('\n')
  })
})

describe('a live Lever posting (plain intro plus HTML lists)', async () => {
  const [raw] = await lever({ slug: 'meesho' }).fetch(http([fixture('lever-meesho-posting.json')]))
  const text = stored(raw)

  it('keeps the plain intro paragraphs', () => {
    expect(text.startsWith('About the Team\n\nWould you like to be part of creating a unicorn')).toBe(true)
  })

  it('sets each list heading on its own line above its items, a blank line from the last', () => {
    expect(text).toContain('\n\nWhat you will do:\n- Over the longer horizon')
    expect(text).toContain('\n\nWhat you will need:\n- 3-6 years of relevant Fin-Tech experience')
  })

  it('leaks no tags', () => {
    expect(text).not.toMatch(LEAK)
  })
})

describe('a live Ashby posting (real HTML)', async () => {
  const job = fixture('ashby-posthog-job.json')
  const [raw] = await ashby({ slug: 'posthog' }).fetch(http({ jobs: [job] }))
  const text = stored(raw)

  it('keeps the headings, paragraphs and lists the board wrote', () => {
    expect(text.startsWith('About PostHog\n\nProduct development used to mean')).toBe(true)
    expect(text).toContain('products, including:\n\n- PostHog Desktop, the only AI devtool')
    expect(text).toContain('\n\nThings we care about\n\n- Transparency: Everyone can read')
  })

  // The plain body Ashby also sends writes each URL out after its link.
  it('reads links as their words, not their URLs', () => {
    expect(job.descriptionPlain).toContain('self-driving https://posthog.com/self-driving')
    expect(text).toContain('PostHog makes products self-driving. It')
    expect(text).not.toContain('https://')
  })

  it('leaks no tags', () => {
    expect(text).not.toMatch(LEAK)
  })

  // Past the plain-text path, normalize() used to collapse these newlines too.
  it('keeps the newlines of a plain body when that is all a board sends', () => {
    const plain = stored({ externalId: '1', title: 'T', description: job.descriptionPlain })
    expect(plain.startsWith('ABOUT POSTHOG\n\nProduct development used to mean')).toBe(true)
    expect(plain).toContain('\n- PostHog Desktop')
    expect(plain).not.toMatch(/\n +/)
  })
})

describe('a live SmartRecruiters posting (sections of HTML)', () => {
  const body = descriptionFromSections(fixture('smartrecruiters-freshworks-posting.json').jobAd.sections)
  const text = stored({ externalId: '1', title: 'Lead', description: body })

  it('opens each section with its title as a heading line', () => {
    expect(text.startsWith('Job Description\n\nWe are looking for a Channel Manager')).toBe(true)
    // Past the 4000 characters normalize() keeps, so read off the adapter.
    expect(body).toMatch(/\n\nQualifications\n\n\S/)
  })

  it('keeps its numbered sub-headings apart from their lists', () => {
    expect(text).toContain('\n\n2. Partner Activation & Readiness\n\n- Own the activation of newly recruited partners')
  })

  it('leaves the company boilerplate out and leaks no tags', () => {
    expect(text).not.toContain('Company Description')
    expect(text).not.toMatch(LEAK)
  })
})
