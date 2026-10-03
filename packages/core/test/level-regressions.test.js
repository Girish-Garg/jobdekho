import { describe, it, expect } from 'vitest'
import { levelTag } from '@jobdekho/core/level.js'

// The 2026-10-03 level study's regressions, each cut verbatim from a stored
// posting (only trimmed): the ones today's rules got wrong and the ones the
// fixes must not break. The postings' en dashes are written as escapes
// here; reading them as ranges is one of the fixes.
//
// [title, body, expected, the board's filing]. 'not internship' accepts any
// level but internship, unknown included.
const CASES = [
  // Must NOT be internships.
  ['Software Engineering', "Required/Minimum Qualifications\n\nAssociate's Degree or Apprenticeship in Computer Science, or related technical discipline AND 6+ months work or internship proven experience coding in languages including, but not limited to, C, C++, C#, Java, JavaScript, or Python OR equivalent experience.", 'not internship'],
  ['Software Engineer, Portfolio Management Group, Analyst', 'Our hybrid work model\n\nBlackRock’s hybrid work model is designed to enable a culture of collaboration and apprenticeship that enriches the experience of our employees, while supporting flexibility for', 'not internship'],
  ['Software Engineer', 'Minimum Qualifications:\n\n- Bachelors + 2 years of related experience OR Masters + 0 years of related experience.\n- Requires basic knowledge of development theories, principles and concepts; has exposure to current technologies through coursework or internship.', 'not internship'],
  ['Computer Vision', 'Bachelor’s degree in Computer Science, Data Science, or a related technical field\n1\u20133 years of experience or strong internship/projects in computer vision or ML model development', 'entry'],
  ['Supplier Engineer', 'Preferred (Nice-to-Have)\n\n- Internship or project experience in semiconductor manufacturing or quality engineering.', 'not internship'],
  ['Cloud / Platform Engineer', 'You can apply at: https://www.supero.dev/careers/cloud-platform-engineer/\n\nIntern Position: https://www.supero.dev/careers/software-engineer-intern/', 'not internship'],
  ['Full Stack Developer - Freshers - Onsite', 'The ideal candidate should have strong programming fundamentals, hands-on exposure through academic, certification, internship, or personal projects, and a willingness to learn and contribute to real-world products.', 'entry'],
  ['Graduate Engineer Trainee', '- Recent graduate or up to 1 year of relevant internship or industrial experience.', 'entry'],
  ['Trainee Engineer', '- Recent graduate or up to 1 year of relevant internship or experience.', 'entry'],
  ['Trainee Content Engineer', 'Location: Pune, India (Work from Office) Permanent - Full time', 'entry'],
  ['Corporate Sales - Trainee ( Freshers)', '', 'entry'],
  ['Data Analytics Trainee', '', 'entry', 'job'],
  // Must stay or become internships.
  ['Frontend Developer', 'Company Description\nTechBRJ aims to create technology that grows alongside its clients’ businesses.\n\nRole Description This is an on-site internship role for a Frontend Developer based in Lucknow.', 'internship'],
  ['Data Analyst', 'Duration: 3 months Stipend: Up to ₹10,000 (performance-based) Type: Paid, remote internship', 'internship'],
  ['MERN Stack Developer Trainee', '- Portfolio, GitHub profile, or examples of relevant projects (if available).\n\nNote: This is a unpaid internship.Skills: react.js,next.js,sql database,node.js', 'internship'],
  ['Conversation Quality Analyst', 'This is an internship role for someone early in their career who wants hands-on e', 'internship'],
  ['Unpaid Internship_React Native', '', 'internship'],
  ['Interim Engineering Intern_2027_SW', '', 'internship'],
  ['Operations Associate, Apprenticeship', 'This is a 6-month Apprenticeship Intern Program, starting in Jan 2027', 'internship'],
  ['Architecture Internship', '', 'internship', 'job'],
  // Other level cases.
  ['IN_Senior Associate_Azure Data Engineer_GCC_Advisory_Mumbai', '', 'senior'],
  ['IN_Manager_AI Data Scientist Engineer_GCC_Advisory_Bangalore', '*Years of experience required\n\n• 6\u201310 years of experience as a Business Systems Analyst.', 'senior'],
  ['Finacle_Q3FY27_Sr. System Engineer (Java)', '', 'senior'],
  ['Software Engineer 2 (Frontend)', '', 'mid'],
  ['SDE I (UI)', '', 'entry'],
  ['Software Engineer 3 (Fullstack)', '', 'senior'],
  ['VP Software Engineer, FIC Sales Technology', '', 'senior'],
  ['Financial Model Engineer, Vice President', '', 'senior'],
  ['Snowflake Admin', 'Minimum Qualifications:\n\n• 6\u20138 years of overall experience with strong hands-on experience in Snowflake administration', 'senior'],
  ['Software Engineer - Kotlin Automation', 'We are seeking a highly motivated Automation Developer with 3 \u20136 years of experience in software development and test automation.\n\nWhat Makes You Eligible\n\n- 3\u20136 years of relevant experience in automation development and testing', 'mid'],
  ['Data Analyst (Punjabi Speaker)', '', 'entry', 'job', 0],
]

describe('the level study regressions', () => {
  it('holds all 31', () => {
    expect(CASES).toHaveLength(31)
  })

  for (const [title, body, want, filed = null, experienceYears = null] of CASES) {
    it(`${title} reads as ${want}`, () => {
      const got = levelTag({ title, description: body, board: { type: filed }, experienceYears })?.value ?? null
      if (want === 'not internship') expect(got).not.toBe('internship')
      else expect(got).toBe(want)
    })
  }
})
