import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { jobUrl, parseLinkedinJob } from '@jobdekho/sources/boards/linkedin-job.js'

// Trimmed from a live jobs-guest jobPosting response, company and text made
// up. The structure is as captured: an Apply button with the offsite icon
// that opens a sign-in prompt, the body in show-more-less-html__markup next
// to its Show more and Show less buttons, and the criteria list below it.
const view = readFileSync(new URL('./fixtures/linkedin-job-view.html', import.meta.url), 'utf8')

const withEmploymentType = (value) => view.replace(
  /(Employment type\s*<\/h3>\s*<span[^>]*>)\s*Internship/,
  `$1 ${value}`,
)

// The shape earlier guest pages used for the company's own apply link.
const withApplyUrl = (href) => view.replace(
  '<code id="decoratedJobPostingId"',
  `<code id="applyUrl" style="display: none"><!--"${href}"--></code>\n    <code id="decoratedJobPostingId"`,
)

describe('parseLinkedinJob', () => {
  it('reads the body as plain text, keeping its paragraphs and bullets', () => {
    const { description } = parseLinkedinJob(view)
    expect(description).toContain('About Northwind Labs\n\nNorthwind Labs builds route planning software')
    expect(description).toContain("What you'll do")
    expect(description).toContain('- Build and ship features in React and Node.js\n- Write tests & review code with the team')
    expect(description).toContain('B.Tech in Computer Science')
    expect(description).not.toMatch(/<|&amp;|&#39;/)
  })

  it('leaves the Show more and Show less labels out of the body', () => {
    expect(parseLinkedinJob(view).description).not.toMatch(/Show (more|less)/)
  })

  it('sets internship from an explicit employment type', () => {
    expect(parseLinkedinJob(view).level).toBe('internship')
  })

  it('leaves the level alone for any other employment type', () => {
    expect(parseLinkedinJob(withEmploymentType('Full-time')).level).toBeUndefined()
  })

  // Seen live: Seniority level Internship on a posting whose employment type
  // was Temporary. The picker is not trusted, so the title decides instead.
  it('ignores the seniority picker', () => {
    const temporary = withEmploymentType('Temporary')
    expect(temporary).toMatch(/Seniority level[\s\S]*?Internship/)
    expect(parseLinkedinJob(temporary).level).toBeUndefined()
  })

  // What every page sampled on 2026-09-30 looked like: the card's LinkedIn
  // link has to stand.
  it('has no url of its own when the page names no apply address', () => {
    expect(parseLinkedinJob(view)).not.toHaveProperty('url')
  })

  it('takes the company apply address out of a LinkedIn redirect', () => {
    const page = withApplyUrl('https://www.linkedin.com/jobs/view/externalApply/4400000001?url=https%3A%2F%2Fcareers%2Enorthwind%2Eexample%2Fjobs%2F77%3Fsource%3Dlinkedin&urlHash=AbCd')
    expect(parseLinkedinJob(page).url).toBe('https://careers.northwind.example/jobs/77?source=linkedin')
  })

  it('takes a plain offsite apply address as it is', () => {
    expect(parseLinkedinJob(withApplyUrl('https://jobs.kestrel.example/apply/9')).url).toBe('https://jobs.kestrel.example/apply/9')
  })

  it('ignores an apply address that leads back to LinkedIn or is not http', () => {
    expect(parseLinkedinJob(withApplyUrl('https://www.linkedin.com/jobs/view/4400000001')).url).toBeUndefined()
    expect(parseLinkedinJob(withApplyUrl('https://www.linkedin.com/jobs/view/externalApply/1?url=javascript%3Aalert(1)')).url).toBeUndefined()
    expect(parseLinkedinJob(withApplyUrl('https://www.linkedin.com/jobs/view/externalApply/1?url=not%20a%20url')).url).toBeUndefined()
  })

  it('returns an empty body, not an error, when the markup is missing', () => {
    expect(parseLinkedinJob('')).toEqual({ description: '' })
    expect(parseLinkedinJob('<section class="description"><p>moved</p></section>')).toEqual({ description: '' })
  })
})

describe('jobUrl', () => {
  it('is the guest view of one posting', () => {
    expect(jobUrl('4400000001')).toBe('https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4400000001')
  })
})
