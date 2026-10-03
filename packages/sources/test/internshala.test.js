import { describe, it, expect } from 'vitest'
import { parseInternshala, parsePostedAt } from '@jobdekho/sources/boards/internshala.js'

// Mirrors the live card: one .internship_meta wrapper whose text runs together
// as "title company location stipend duration description", with each value
// also carried by its own icon element.
const html = `
<div class="container-fluid individual_internship logged_out_jd_summary" internshipId="900">
  <div class="row-1-item internship_meta">
    <a class="job-title-href" id="job_title" href="/internship/detail/web-dev-900">Web Development</a>
    <p class="company-name">Acme Labs</p>
    <span>Actively hiring</span>
    <div class="row-1-item locations"><i class="ic-16-map-pin"></i><span>Bangalore</span></div>
    <div><i class="ic-16-money"></i><span>&#8377; 8,000 /month</span></div>
    <div><i class="ic-16-calendar"></i><span>3 Months</span></div>
    <div><i class="ic-16-reschedule"></i><span>2 days ago</span></div>
    <div><i class="ic-16-assignment icon"></i><span>1. Build responsive interfaces. 2. Ship features.</span></div>
  </div>
</div>`

describe('parseInternshala', () => {
  it('keeps the logo address from the card, or none', () => {
    const logo = 'https://internshala-uploads.internshala.com/logo%2Fabc.jpg.webp'
    const withLogo = html.replace(/<\/div>\s*<\/div>\s*$/, `</div>
  <div class="internship_logo"><img src="${logo}" alt="Acme Labs"></div>
</div>`)
    expect(parseInternshala(withLogo)[0].logoUrl).toBe(logo)
    expect(parseInternshala(html)[0].logoUrl).toBeNull()
  })

  it('extracts internship cards', () => {
    const [r] = parseInternshala(html)
    expect(r.externalId).toBe('900')
    expect(r.title).toBe('Web Development')
    expect(r.company).toBe('Acme Labs')
    expect(r.location).toBe('Bangalore')
    expect(r.url).toBe('https://internshala.com/internship/detail/web-dev-900')
    expect(r.tags).toEqual(['internship'])
    expect(typeof r.postedAt).toBe('string')
    expect(r.stipend).toContain('8,000')
    expect(r.duration).toContain('3 Months')
  })

  // The card repeats stipend, duration and location ahead of the description.
  // Carrying that into the snippet made the UI print each amount twice.
  it('keeps the structured fields out of the description', () => {
    const [r] = parseInternshala(html)
    expect(r.description).toBe('1. Build responsive interfaces. 2. Ship features.')
    expect(r.description).not.toContain('8,000')
    expect(r.description).not.toContain('3 Months')
    expect(r.description).not.toContain('Bangalore')
    expect(r.description).not.toContain('Acme Labs')
  })

  // Titles are bare skill names, so the listing category is the only signal.
  it('trusts the listing category for level', () => {
    expect(parseInternshala(html)[0].level).toBe('internship')
    expect(parseInternshala(html, 'job')[0].level).toBeUndefined()
    expect(parseInternshala(html, 'job')[0].tags).toEqual(['job'])
  })

  // A posting from the jobs list is a job: core never infers an internship
  // from its text, as it never did for Unstop's.
  it('files each posting under the list it came from', () => {
    expect(parseInternshala(html, 'job')[0].type).toBe('job')
    expect(parseInternshala(html)[0].type).toBe('internship')
  })

  // About half of Internshala's cards are work-from-home and carry a home icon
  // rather than a map pin, which previously left their location blank.
  it('reads work-from-home as a location', () => {
    const wfh = html.replace('<i class="ic-16-map-pin"></i><span>Bangalore</span>',
      '<i class="ic-16-home"></i><span>Work from home</span>')
    expect(parseInternshala(wfh)[0].location).toBe('Work from home')
  })

  // Job cards render the salary twice for responsive layouts, which printed
  // "3,00,000 - 3,60,000 3,00,000 - 3,60,000 /year" straight into the UI.
  it('reads a responsive value once, keeping the unit', () => {
    const job = html.replace(
      '<i class="ic-16-money"></i><span>&#8377; 8,000 /month</span>',
      '<i class="ic-16-money"></i><span class="desktop">&#8377; 3,00,000 - 3,60,000</span>' +
      '<span class="mobile">&#8377; 3,00,000 - 3,60,000 /year</span>',
    )
    expect(parseInternshala(job)[0].stipend).toBe('₹ 3,00,000 - 3,60,000 /year')
  })

  it('skips cards missing id or title', () => {
    expect(parseInternshala('<div class="individual_internship"></div>')).toEqual([])
  })
})

describe('parsePostedAt', () => {
  const now = Date.UTC(2026, 5, 28)
  it('parses relative days and weeks', () => {
    expect(parsePostedAt('2 days ago', now)).toBe(new Date(now - 2 * 86400000).toISOString())
    expect(parsePostedAt('1 week ago', now)).toBe(new Date(now - 7 * 86400000).toISOString())
  })
  it('treats hours/today as now', () => {
    expect(parsePostedAt('Few hours ago', now)).toBe(new Date(now).toISOString())
  })
  it('returns null when no date is present', () => {
    expect(parsePostedAt('Actively hiring')).toBeNull()
  })
})
