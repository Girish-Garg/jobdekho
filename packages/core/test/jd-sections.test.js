import { describe, it, expect } from 'vitest'
import { sectionize, units } from '@jobdekho/core/jd-sections.js'

const sections = (text, company) => sectionize(text, company).map((u) => [u.section, u.text])

describe('units', () => {
  // Boards flatten an ad to one line, so bullets and numbering are the edges.
  it('cuts a flattened body at sentences, bullets and numbering', () => {
    expect(units('Key responsibilities: 1. Build APIs. 2. Ship features.')).toEqual([
      'Key responsibilities:', 'Build APIs.', 'Ship features.',
    ])
    expect(units('You will: - Design - Build')).toEqual(['You will:', 'Design', 'Build'])
  })

  // The en dash bullet some boards use, matched by code point.
  it('treats a dash bullet as an edge', () => {
    expect(units('Skills \u2013 React \u2013 Node')).toEqual(['Skills', 'React', 'Node'])
  })

  it('drops tag names left over from an old HTML strip', () => {
    expect(units('p strong About us /strong /p')).toEqual(['About us'])
  })
})

describe('sectionize', () => {
  it('labels units by the heading that opens them', () => {
    const got = sections('You will: - Build APIs. You are: - Fluent in SQL. WHAT WE OFFER - Health cover.')
    expect(got).toEqual([
      ['resp', 'You will:'], ['resp', 'Build APIs.'],
      ['req', 'You are:'], ['req', 'Fluent in SQL.'],
      ['benefits', 'WHAT WE OFFER'], ['benefits', 'Health cover.'],
    ])
  })

  // Some boards strip apostrophes.
  it('reads a heading with its apostrophe gone', () => {
    expect(sections('What you ll be doing: Build the app.')[0][0]).toBe('resp')
    expect(sections('What we re looking for: React.')[0][0]).toBe('req')
  })

  it('marks an optional line wherever it sits', () => {
    const got = sections('Requirements: - Python. - Bonus points if you know Svelte.')
    expect(got.at(-1)).toEqual(['nice', 'Bonus points if you know Svelte.'])
  })

  // "Experience with X" opens a bullet far more often than a section, so a
  // long one inside a nice-to-have list stays nice-to-have.
  it('does not let a long bullet starting "Experience" end the section it is in', () => {
    const got = sections('Nice to have: - Experience with Kafka and Redis in production systems at scale.')
    expect(got.at(-1)[0]).toBe('nice')
  })

  it('reads the company describing itself before any heading as about', () => {
    const got = sections('Supabase is the Postgres development platform. We are seeking engineers who ship. You will build APIs.', 'Supabase')
    expect(got[0][0]).toBe('about')
    expect(got[2][0]).toBe('resp')
  })

  it('keeps an intro that speaks to the reader as part of the role', () => {
    const got = sections('As a developer at Acme Corp, you will build React apps.', 'Acme Corp')
    expect(got[0][0]).toBe('intro')
  })

  it('reads "You might be a good fit if you" as requirements', () => {
    expect(sections('You might be a good fit if you: - Know Go.')[1][0]).toBe('req')
  })

  // Headings stored ads use often, which once left their content read as
  // company copy.
  it('reads the headings the study found missing', () => {
    for (const heading of ['Role Description', 'Role Summary', 'Job Responsibilities', 'Core Responsibilities', 'Job Overview', 'About the Job']) {
      expect(sections(`${heading}\nBuild APIs.`)[1][0]).toBe('resp')
    }
    for (const heading of ['Minimum Requirements', 'Educational Requirements', 'Technical Requirements', 'Educational/Technical Requirements', 'Mandatory Skills', 'Education']) {
      expect(sections(`${heading}\nB.Tech in CS.`)[1][0]).toBe('req')
    }
    expect(sections('How to apply\nSend your CV.')[1][0]).toBe('apply')
  })

  // "Education in Go" opens a bullet, not a section.
  it('does not let a long bullet starting "Education" end the section it is in', () => {
    const got = sections('Responsibilities: - Build APIs. - Education outreach programmes for our customers across India every quarter.')
    expect(got.at(-1)[0]).toBe('resp')
  })
})
