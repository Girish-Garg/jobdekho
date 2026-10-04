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

  // A cue that qualifies part of a line leaves it a requirement: on the
  // owner's postings, the old cue-anywhere rule moved 7 of 40 checked
  // must-haves to nice.
  it('keeps a must-have with an optional part where its heading put it', () => {
    const got = sections("Requirements: - 3 years of Java, preferably Spring. - Bachelor's degree required (Master's preferred). - Kafka is a plus.")
    expect(got.slice(1)).toEqual([
      ['req', '3 years of Java, preferably Spring.'],
      ['req', "Bachelor's degree required (Master's preferred)."],
      ['nice', 'Kafka is a plus.'],
    ])
  })

  // Headings the owner's postings use that the lists missed, whose lines
  // were read as requirements or duties.
  it('reads the nice-to-have and must-have headings the lists missed', () => {
    for (const heading of ['You may also have:', 'Will be added advantages if you have', 'Ways to stand out from the crowd:', 'Extras good to have', 'Desired Qualifications:', 'Optional Skills', 'You Might Also Have:']) {
      expect(sections(`Requirements:\n- Go\n${heading}\n- Rust`).at(-1)).toEqual(['nice', 'Rust'])
    }
    for (const heading of ['This is you', 'What we need to see:', 'Your Background', 'Required:', 'You will have:', 'For This Role, You Will Need:']) {
      expect(sections(`What you'll be doing:\n- Build APIs\n${heading}\n- 5 years of Go`).at(-1)).toEqual(['req', '5 years of Go'])
    }
  })

  it('does not take a sentence or an inline field for one of those headings', () => {
    expect(sections('Responsibilities:\n- Build APIs\nRequired to travel 20% of the time.\n- Ship weekly').at(-1)[0]).toBe('resp')
    expect(sections('Responsibilities:\n- Build APIs\nDesired: worked with an engine OEM\n- Ship weekly').at(-1)[0]).toBe('resp')
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
