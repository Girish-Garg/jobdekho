import { describe, it, expect } from 'vitest'
import { parseInternshala, parsePostedAt } from '@jobdekho/sources/boards/internshala.js'

const html = `
<div class="container-fluid individual_internship logged_out_jd_summary" internshipId="900">
  <a class="job-title-href" id="job_title" href="/internship/detail/web-dev-900" target="_blank">Web Development Internship</a>
  <p class="company-name">Acme Labs</p>
  <div class="row-1-item internship_meta"><span class="item_link internship_item_location"><a>Bangalore</a></span></div>
  <div class="internship_meta">3 Months</div>
  <div class="status-success"><i></i><span>2 days ago</span></div>
</div>`

describe('parseInternshala', () => {
  it('extracts internship cards', () => {
    const [r] = parseInternshala(html)
    expect(r.externalId).toBe('900')
    expect(r.title).toBe('Web Development Internship')
    expect(r.company).toBe('Acme Labs')
    expect(r.location).toBe('Bangalore')
    expect(r.url).toBe('https://internshala.com/internship/detail/web-dev-900')
    expect(r.tags).toEqual(['internship'])
    expect(typeof r.postedAt).toBe('string')
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
