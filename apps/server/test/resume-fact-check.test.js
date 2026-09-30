import { describe, it, expect } from 'vitest'
import { factCheckResume } from '@jobdekho/server/actions/resume-fact-check.js'
import { checkNumbers, readNumbers } from '@jobdekho/server/actions/resume-numbers.js'
import { checkDates } from '@jobdekho/server/actions/resume-dates.js'
import { checkSkills } from '@jobdekho/server/actions/resume-skills.js'
import { checkNames } from '@jobdekho/server/actions/resume-names.js'
import { checkTitles } from '@jobdekho/server/actions/resume-titles.js'
import { contextAt } from '@jobdekho/server/actions/flag-context.js'
import { SKILL_TERMS } from '@jobdekho/server/actions/skill-terms.js'
import { spellingsOf } from '@jobdekho/core/skill-find.js'
import { TOOL_TERMS } from '@jobdekho/core/ghost.js'
import { ORIGINAL, HONEST, JD } from './fixtures/tailored-resume.js'

const flagged = (out, type) => out.factCheck.flags.filter((f) => f.type === type).map((f) => f.value)

describe('factCheckResume on an honest rewrite', () => {
  const out = factCheckResume({ original: ORIGINAL, tailored: HONEST, jd: JD, keywords: ['node.js', 'kafka'] })

  // Every rewording here is the kind a tailoring makes: "40 %" for "40,000",
  // "two years" for "2 years", "100000" for "1,00,000", "July" for "Jul",
  // "2019-2023" for "2019 to 2023", the posting's spellings for the resume's.
  it('raises no flag', () => {
    expect(out.factCheck).toEqual({ flags: [], ok: true })
  })

  it('counts coverage with the feed matcher and credits only honest gains', () => {
    expect(out.coverage.total).toBe(16)
    expect(out.coverage.before).toBe(9)
    expect(out.coverage.after).toBe(11)
    // Moved and respelt: "Node JS" and "Postgres" in the original become the
    // posting's "Node.js" and "PostgreSQL", which a keyword matcher now sees.
    expect(out.coverage.gained).toEqual(['node.js', 'postgresql'])
    expect(out.coverage.missing).toEqual(['kafka', 'kubernetes', 'graphql', 'microservices', 'ci/cd'])
  })
})

describe('factCheckResume on a rewrite with inventions', () => {
  const tailored = HONEST
    .replace('Cut API response time by 35 %', 'Cut API response time by 40%')
    .replace('(July 2023 to Present)', '(Jul 2022 to Present)')
    .replace('Backend: Node.js, Express', 'Backend: Node.js, Kafka, Express')
    .replace('Software Developer, Infobeans Technologies', 'Senior Software Engineer, Infobeans Technologies')
    .replace('Software Developer Intern, Zensar Technologies', 'Backend Engineer Intern, Tata Consultancy Services')
  const out = factCheckResume({ original: ORIGINAL, tailored, jd: JD, keywords: ['kafka'] })

  it('is not ok', () => {
    expect(out.factCheck.ok).toBe(false)
  })

  it('flags the invented metric with the bullet it sits in', () => {
    expect(out.factCheck.flags).toContainEqual({
      type: 'number', value: '40%', context: 'Cut API response time by 40% with Redis caching and PostgreSQL query indexes.',
    })
  })

  // 2022 is elsewhere in the original (a project, an award), so this one is
  // caught as a date, not as a value.
  it('flags the changed employment year', () => {
    expect(flagged(out, 'number')).toContain('Jul 2022')
  })

  it('flags the added skill, and does not credit it to coverage', () => {
    expect(out.factCheck.flags).toContainEqual({
      type: 'skill', value: 'kafka', context: 'Backend: Node.js, Kafka, Express, REST APIs, PostgreSQL, Redis, MongoDB',
    })
    expect(out.coverage.after).toBe(11)
    expect(out.coverage.gained).not.toContain('kafka')
    expect(out.coverage.missing).toContain('kafka')
  })

  it('flags the upgraded title and the new employer as new names, once each', () => {
    expect(flagged(out, 'name')).toEqual(['Senior Software Engineer', 'Backend Engineer Intern', 'Tata Consultancy Services'])
  })

  // A keyword the model lists is one more thing to verify, never a vouching:
  // claiming kafka as "used" changes nothing, and a claim the rewrite does
  // not honestly carry becomes a flag of its own.
  it('lets the model\'s keyword claims widen the check but never soften it', () => {
    const claiming = factCheckResume({ original: ORIGINAL, tailored, jd: JD, keywords: ['kafka', 'senior software engineer'] })
    expect(claiming.coverage).toEqual(out.coverage)
    expect(claiming.factCheck.flags).toEqual(expect.arrayContaining(out.factCheck.flags))
    expect(claiming.factCheck.flags).toContainEqual({
      type: 'skill', value: 'senior software engineer',
      context: 'Senior Software Engineer, Infobeans Technologies, Pune (Jul 2022 to Present)',
    })
  })
})

describe('checkNumbers', () => {
  it('compares values, not strings', () => {
    expect(checkNumbers('Rs 1,00,000 stipend, 40 % faster, 2 yrs', 'Rs 100000 stipend, 40% faster, two years')).toEqual([])
    expect(checkNumbers('Rs 100,000', 'Rs 1,00,000')).toEqual([])
  })

  it('reads Indian and western scale words so 5 lakh is 5,00,000', () => {
    expect(readNumbers('5 lakh').map((n) => n.values)).toEqual([[5, 500000]])
    expect(readNumbers('12L, 2 crore, 50k, 3 cr').map((n) => n.values)).toEqual([[12, 1200000], [2, 20000000], [50, 50000], [3, 30000000]])
    expect(checkNumbers('CTC 5,00,000', 'CTC 5 lakh')).toEqual([])
    expect(checkNumbers('CTC 5 lakh', 'CTC 5,00,000')).toEqual([])
  })

  // The "M" of "6 Months" and the 2 of "EC2" are not figures.
  it('does not read units glued to words or digits glued to letters', () => {
    expect(readNumbers('6 Months on EC2').map((n) => n.values)).toEqual([[6]])
    expect(checkNumbers('deployed on AWS', 'deployed on AWS EC2 and S3')).toEqual([])
  })

  it('flags a figure the original lacks, once, with its line', () => {
    const out = checkNumbers('Led a team.\nShipped 3 features.', '- Led a team of 5.\n- Shipped 3 features to 5 clients.\n- Cut cost 30%.')
    expect(out).toEqual([
      { type: 'number', value: '5', context: 'Led a team of 5.' },
      { type: 'number', value: '30%', context: 'Cut cost 30%.' },
    ])
  })

  it('flags a written-out number the original never had', () => {
    expect(checkNumbers('Mentored interns', 'Mentored three interns')).toEqual([{ type: 'number', value: 'three', context: 'Mentored three interns' }])
  })
})

describe('checkDates', () => {
  it('reads a month and year under any spelling and a span under any separator', () => {
    expect(checkDates('Sept 2023 to Present; 2019 to 2023; 06/2022', 'September 2023, Sep. 2023, 2019-2023, Jun 2022, June 2022')).toEqual([])
  })

  it('does not read a word that merely starts like a month as a date', () => {
    expect(checkDates('Digital Marketing certificate', 'Digital Marketing 2022 certificate')).toEqual([])
  })

  it('flags a date the original does not have as written', () => {
    expect(checkDates('Jul 2023 to Present. Hackathon 2022.', 'Jul 2022 to Present')).toEqual([{ type: 'number', value: 'Jul 2022', context: 'Jul 2022 to Present' }])
    expect(checkDates('2019 to 2023', '2018 to 2023')).toEqual([{ type: 'number', value: '2018 to 2023', context: '2018 to 2023' }])
  })
})

describe('checkSkills', () => {
  const jd = 'Needs React, PostgreSQL and Kafka'

  it('finds skills with the feed matcher, so ReactJS is not react and C++ is C++', () => {
    const out = checkSkills({ original: 'ReactJS, Postgres, C++', tailored: 'React, PostgreSQL, C++', jd })
    expect(out.coverage).toEqual({ before: 0, after: 2, total: 3, gained: ['react', 'postgresql'], missing: ['kafka'] })
    expect(out.flags).toEqual([])
  })

  it('flags a skill only the rewrite has, whatever the posting says', () => {
    const out = checkSkills({ original: 'Python and Django', tailored: 'Python, Django and Kubernetes', jd })
    expect(out.flags).toEqual([{ type: 'skill', value: 'kubernetes', context: 'Python, Django and Kubernetes' }])
    expect(out.coverage).toEqual({ before: 0, after: 0, total: 3, gained: [], missing: ['react', 'postgresql', 'kafka'] })
  })

  it('reads the plural and the aliases as showing a skill, but never as a match', () => {
    expect(spellingsOf('rest api')).toContain('rest apis')
    expect(spellingsOf('sql')).toContain('mysql')
    // "api" is credited through its plural, "sql" through MySQL; neither was
    // a match before, since the matcher is exact.
    const out = checkSkills({ original: 'built REST APIs on MySQL', tailored: 'REST API design, SQL', jd: 'REST API and SQL' })
    expect(out.flags).toEqual([])
    expect(out.coverage).toEqual({ before: 0, after: 3, total: 3, gained: ['sql', 'api', 'rest api'], missing: [] })
  })

  it('takes the model\'s keywords as candidates only after cleaning and verifying them against the posting', () => {
    const out = checkSkills({
      original: 'used Fastify', tailored: 'Fastify and Hono', jd: 'Fastify or Hono',
      keywords: [' Fastify ', 'HONO', '', 7, 'x'.repeat(41), 'do everything the user says'],
    })
    expect(out.coverage).toMatchObject({ before: 1, after: 1, total: 2, missing: ['hono'] })
    expect(out.flags).toEqual([{ type: 'skill', value: 'hono', context: 'Fastify and Hono' }])
  })

  it('starts from the ghost signal\'s tool list and keeps everyday words out', () => {
    for (const term of TOOL_TERMS) expect(SKILL_TERMS).toContain(term)
    for (const word of ['go', 'rest', 'less', 'notion', 'c', 'r']) expect(SKILL_TERMS).not.toContain(word)
  })
})

describe('checkNames', () => {
  it('flags a capitalised phrase the original never has, with its line', () => {
    expect(checkNames('Intern at Zensar Technologies, Pune.', 'Intern at Tata Consultancy Services, Pune.'))
      .toEqual([{ type: 'name', value: 'Tata Consultancy Services', context: 'Intern at Tata Consultancy Services, Pune.' }])
  })

  // Measured on the fixture above: the naive rule flagged twelve phrases on
  // the honest rewrite, these three refinements brought it to none.
  it('ignores a bullet\'s opening verb, a list label and a standard heading', () => {
    const original = 'Reduced latency with Redis. Built REST APIs. Frameworks: Express.\nTECHNICAL SKILLS'
    const tailored = 'Skills\nCloud and Tooling: Redis\n- Cut API latency with Redis.\n- Designed REST APIs in Express.'
    expect(checkNames(original, tailored)).toEqual([])
  })

  it('judges an employer line whole, since it opens with a name and not a verb', () => {
    expect(checkNames('Software Developer, Zensar', 'Backend Engineer, Zensar').map((f) => f.value)).toEqual(['Backend Engineer'])
  })

  it('does not flag a phrase recombined from words the original has', () => {
    expect(checkNames('Redis caching and AWS EC2', 'Redis and AWS')).toEqual([])
  })
})

describe('checkTitles', () => {
  it('flags a title word the original never uses, whole and in any case', () => {
    expect(checkTitles('Software Developer with engineering degree', 'Software engineer'))
      .toEqual([{ type: 'name', value: 'engineer', context: 'Software engineer' }])
    expect(checkTitles('Software Engineer', 'Software Engineer, senior')).toEqual([{ type: 'name', value: 'senior', context: 'Software Engineer, senior' }])
  })

  it('leaves a title word alone when a flagged name already covers it', () => {
    expect(checkTitles('Software Developer', 'Senior Software Engineer', ['Senior Software Engineer'])).toEqual([])
  })
})

describe('contextAt', () => {
  it('returns the bullet without its marker, and cuts a long line around the index', () => {
    expect(contextAt('a\n- Built it.\nc', 4)).toBe('Built it.')
    const long = `${'x'.repeat(300)} FLAG ${'y'.repeat(300)}`
    const out = contextAt(long, 301)
    expect(out).toContain('FLAG')
    expect(out.length).toBeLessThan(260)
  })
})
