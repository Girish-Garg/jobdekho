import { describe, it, expect } from 'vitest'
import { statedLevel } from '@jobdekho/core/level-stated.js'
import { levelTag } from '@jobdekho/core/level.js'
import { retagged } from '@jobdekho/core/retag.js'
import { TAGS_VERSION } from '@jobdekho/core/tag.js'

const said = (description, company = 'Acme') => {
  const got = statedLevel(description, company)
  return got && { level: got.level, evidence: got.evidence }
}

describe('statedLevel', () => {
  it('reads nothing from nothing', () => {
    expect(statedLevel('')).toBeNull()
    expect(statedLevel('Build and run our payment APIs in Go.')).toBeNull()
  })

  // A missed level costs less than a wrong one.
  it('leaves statements that disagree unknown', () => {
    expect(said('This is an entry-level role. We are looking for a Senior Engineer to lead the team.')).toBeNull()
    expect(said('Level: Senior\n\nThis is an entry-level role.')).toBeNull()
  })

  it('lets statements that agree stand, quoting the first', () => {
    expect(said('We are looking for a Senior Data Engineer.\nThis is a senior role.')).toEqual({ level: 'senior', evidence: 'Says "We are looking for a Senior Data Engineer"' })
    expect(said('This is a senior role.\nLevel: Senior')).toEqual({ level: 'senior', evidence: 'Level field: Senior' })
  })

  // A statement and an amount are two kinds of evidence; when they disagree
  // at all, neither decides.
  it('leaves a statement and an amount that disagree unknown', () => {
    expect(said('We are looking for a Senior Engineer.\n- At least 3 years of relevant experience.')).toBeNull()
    expect(said('This is an entry-level role.\n- At least 3 years of relevant experience.')).toBeNull()
    expect(said('- At least 3 years of relevant experience.')).toEqual({ level: 'mid', evidence: 'Asks for 3 years' })
  })

  it('lets a statement and an amount that agree stand, quoting the statement', () => {
    expect(said('We are looking for a Senior Engineer.\n- At least 5 years of relevant experience.'))
      .toEqual({ level: 'senior', evidence: 'Says "We are looking for a Senior Engineer"' })
  })

  // An amount only wished for is neither a level nor a disagreement.
  it('never lets optional years decide or disagree', () => {
    expect(said('Preferred Qualifications:\n- 2 years of industry work experience in project costing.')).toBeNull()
    expect(said('We are looking for a Senior Engineer.\n- 2 years of Kafka experience is a plus.'))
      .toEqual({ level: 'senior', evidence: 'Says "We are looking for a Senior Engineer"' })
  })

  it('reads requirements again once a Nice to have list ends', () => {
    expect(said('Nice to have:\n- 2 years of Rust experience\nRequirements:\n- Minimum 5 years of experience in Java'))
      .toEqual({ level: 'senior', evidence: 'Asks for 5 years' })
  })

  // "Good to have skills: NA" is an empty field, not a heading over the rest.
  it('reads requirements after an empty Nice to have field', () => {
    expect(said('Must have skills: GraphQL (Query Language)\nGood to have skills: NA\nMinimum 12 year(s) of experience is required'))
      .toEqual({ level: 'staff', evidence: 'Asks for 12 years' })
  })

  it('never reads benefits or equal-opportunity copy', () => {
    expect(said('Benefits\n- Our early career programmes help new graduates grow.\n- Freshers are welcome to apply to our academy.')).toBeNull()
  })
})

describe('levelTag with statements in words', () => {
  it('places a posting the board, the title and the years leave unknown, as text evidence', () => {
    expect(levelTag({ title: 'Supplier Engineer', description: 'This entry-level role is designed for recent graduates passionate about quality.' }))
      .toEqual({ value: 'entry', from: 'text', evidence: 'Says "This entry-level role is designed for recent graduates"', version: TAGS_VERSION })
  })

  // Statements come after every reading that decided before them, so no
  // posting placed today moves.
  it('reads statements only after the board, the title and the years', () => {
    expect(levelTag({ title: 'Senior Engineer', description: 'This is an entry-level role.' })).toMatchObject({ value: 'senior', from: 'title' })
    expect(levelTag({ title: 'Engineer', description: 'We are looking for a Senior Engineer. You bring 2-4 years of experience.' }))
      .toMatchObject({ value: 'mid', evidence: 'Asks for 2 to 4 years' })
    expect(levelTag({ title: 'Analyst', description: 'This is a senior role.', experience: 'Fresher', experienceYears: 0 }))
      .toMatchObject({ value: 'entry', from: 'board' })
    expect(levelTag({ title: 'Analyst', description: 'This is a 6-month internship. This is an entry-level role.' })).toMatchObject({ value: 'internship' })
    expect(levelTag({ title: 'Analyst', description: 'This is a senior role.', board: { type: 'internship' } })).toMatchObject({ value: 'internship', from: 'board' })
  })

  // Bumping the version re-tags stored postings once, from the text they kept.
  it('places a stored posting tagged by the rules before', () => {
    const row = { id: 'p1', source: 'workday:intel', title: 'Analog Circuit Design Engineer', company: 'Intel', tags: [], level: null, levelTag: null, tagsVersion: TAGS_VERSION - 1,
      descriptionText: 'This is an entry level position and will be compensated accordingly.' }
    expect(retagged(row)).toMatchObject({ level: 'entry', levelTag: { from: 'text', evidence: 'Says "This is an entry level position"' }, tagsVersion: TAGS_VERSION })
  })
})

// Cut verbatim from stored postings (only trimmed); en dashes are escaped.
// [company, title, body, expected level or null]
const POSTINGS = [
  ['NTT DATA', 'Networking Managed Services Engineer (L1)', "Your day at NTT DATA\nAs a Networking Managed Services Engineer (L1) at NTT DATA, you'll step into an entry-level role where your primary focus will be providing managed services to ensure our clients' IT infrastructure and systems remain operational.", 'entry'],
  ['NTT DATA', 'Cross Technology Managed Services Engineer (L3)', 'You will engage with third-party vendors when necessary and keep systems and portals updated as prescribed. As a senior engineer, you will coach L2 teams on advanced troubleshooting techniques and support the implementation and delivery of projects.', 'senior'],
  ['Micron Technology', 'Package Reliability Engineer', 'Qualification Requirements\n\n- Minimum of a BS degree, M.Sc, or comparable experience in Engineering or a related field\n- Fresh graduates or candidates with less than 2 years of working experience are welcome to apply', 'entry'],
  ['Global Payments', 'Software Engineer', 'Minimum Qualifications\n\n- BS in Computer Science, Information Technology, Business / Management Information Systems or related field\n- No experience required. Typically has a basic knowledge and use of one or more languages / technologies.', 'entry'],
  ['Sourcegraph', 'ML & Agentic Systems Engineer [IC4]', "This is a staff-level role: we're hiring a technical leader, not just a strong individual contributor.", 'staff'],
  ['Dentsu', 'Data Engineer', 'Job Description:\n\nSenior Data Engineer \u2013 Content Ops & Site Quality\n\nRole Overview\n\nWe are looking for a Senior Data Engineer to support the Data Engineering ecosystem for Content Operations and Site Quality.', 'senior'],
  ['PTC', 'Software specialist', 'Your Impact\n\nALM, Pune team, need a Software Developer at mid-experience level who will work on developing and maintaining multiple products within ALM Portfolio.', 'mid'],
  ['Barclays', 'Data Engineer - ETL', '- Collaboration with data scientist to build and deploy machine learning models.\n\nAssistant Vice President Expectations\n\n- To advise and influence decision making, contribute to policy development and take responsibility for operational effectiveness.', 'senior'],
  ['Amgen', 'Data Scientist - Data Modeling/analytics', 'Master’s OR Bachelor’s degree in computer science, statistics or STEM majors with a minimum of 4 years and maximum of 7 years of Information Systems experience.', 'mid'],
  ['Aptiv', 'Automotive FuSa SW Developer', 'Your Background:\n\n- Exp Level 6Yrs to 9Yrs\n- B.E./B.Tech or M.E./M.Tech in Computer Science, Electronics, Electrical, Instrumentation, or a related engineering discipline', 'senior'],
  ['Arista Networks', 'Software Developer(SRE) - CloudVision as a Service (CVaaS)', "As a Senior SRE, you'll be responsible for our global CloudVision service fleet.\n\nQualifications\n\n- At least Bachelors in Computer Science or Engineering + 5 years' experience, MS Computer Science or Engineering + 5 years' experience, or equivalent work experience.", 'senior'],
  ['Cisco', 'ASIC Design Verification Engineer', 'Minimum Qualifications:\n\n- Bachelors + 7 years of related experience, or Masters + 4 years of related experience, or PhD + 1 year of related experience Preferred Qualifications Varies based on the team and business needs | Preferred Qualifications are desired education, experience, and skills that are in addition to Minimum Qualifications', 'senior'],
  ['Accenture', 'Custom Software Engineer', 'Must have skills: GraphQL (Query Language)\nGood to have skills: NA\nMinimum 12 year(s) of experience is required\nEducational Qualification: 15 years full time education', 'staff'],
  // Must stay unknown: evidence that disagrees, or years only wished for.
  ['Amgen', 'Data Scientist - Data Modeling/analytics', 'ABOUT THE ROLE\n\nRole Description:\n\nAs the Senior Associate Data Scientist at Amgen, you will be responsible for developing and deploying advanced machine learning models.\n\nBasic Qualifications:\n\n- Master’s OR Bachelor’s degree in computer science, statistics or STEM majors with a minimum of 4 years and maximum of 7 years of Information Systems experience.', null],
  ['Cisco', 'Software Engineer', 'Cisco Secure Workload is seeking a junior UI/Full Stack developer to assist in developing features for policy, vulnerability management, and more.\n\nMinimum Qualifications:\n\n- Bachelors + 2 years of related experience OR Masters + 0 years of related experience.', null],
  ['Emerson', 'Application Engineer', 'Preferred Qualifications That Set You Apart:\n\n- Knowledge of SAP and ORACLE\n- Prefer 2 years’ industry work experience with experience in project costing or with providing pricing support for projects.', null],
  ['Cyient', 'Assembly Process Planning Engineer', '• 3 years of hands-on experience in Virtual Manufacturing assembly process planning using MPlanner or Wplanner, Excel sheet, PPT, or any other software tools will be added advantages ( Only Mechanical industries, Automotive, Construction, Agriculture, etc)', null],
  ['Millennium', 'Quantitative Developer - Commodities', 'What You Bring\n\n• Early-career experience, with up to 4 years of relevant professional experience preferred.', null],
  ['Copeland', 'FEA Engineer', 'Whether you are a professional looking for a career change, an undergraduate student exploring your first opportunity, or recent graduate with an advanced degree, we have opportunities that will allow you to innovate, be challenged, and make an impact.', null],
  ['KLA', 'DevOps Engineer', "That's where KLA comes in. Whether you're early in your career or an experienced professional, you'll solve complex challenges, work alongside experts and make an impact.", null],
  ['Millennium', 'Software Engineer, Post-Trade Platform (Java/Angular)', '• Experience with Angular and TypeScript, or a strong willingness to develop these skills; mid-level candidates should have delivered Angular work in production.', null],
  ['Coalition Technologies', 'Remote Office Assistant', 'As an Office Assistant, your duties will include:\n\n- Answering phones and emails\n- Completing entry-level bookkeeping tasks, including recording expenses, organizing receipts, and maintaining transaction records.', null],
  ['SS&C Technologies', 'LLMOps Developers', "Minimally requires a Master's degree and 1 years of related experience, Bachelor's degree and 3 years of related experience, or high school degree and 5 years of related experience.", null],
  ['Cisco', "Software Engineer- Master's (Full Time)", 'Education\n\n- M.Tech/M.E. in Computer Science, Information Technology, or a related field; or B.Tech/B.E. in a relevant discipline with at least 2 years of relevant professional experience.', null],
  ['Oracle', 'Data Centre Build Engineer', 'Contributes to the talent development pipeline by participating in candidate interviews, assessing candidates, and providing hiring recommendations.\n\nCareer Level - IC4', null],
  ['Canonical', 'Linux Kernel Engineer', 'We hire candidates of all experience levels from recent university graduates through seasoned industry experts.', null],
]

describe('stated levels in stored postings', () => {
  for (const [company, title, body, want] of POSTINGS) {
    it(`${company}: ${title} reads as ${want ?? 'unknown'}`, () => {
      expect(levelTag({ title, description: body, company })?.value ?? null).toBe(want)
    })
  }
})
