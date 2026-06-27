import { describe, it, expect } from 'vitest'
import { parseInternshala } from '@jobdekho/sources/boards/internshala.js'

const html = `
<div class="individual_internship" data-internship_id="900">
  <div class="company"><a class="job-title-href" href="/internship/detail/900">
    <div class="job-internship-name">Web Development Intern</div></a>
    <p class="company-name">Acme Labs</p></div>
  <div class="locations"><span>Remote</span></div>
  <div class="internship_other_details_container">3 Months  Stipend</div>
</div>`

describe('parseInternshala', () => {
  it('extracts internship cards', () => {
    const [r] = parseInternshala(html)
    expect(r.externalId).toBe('900')
    expect(r.title).toBe('Web Development Intern')
    expect(r.company).toBe('Acme Labs')
    expect(r.location).toBe('Remote')
    expect(r.url).toBe('https://internshala.com/internship/detail/900')
    expect(r.tags).toEqual(['internship'])
  })
  it('skips cards missing id or title', () => {
    expect(parseInternshala('<div class="individual_internship"></div>')).toEqual([])
  })
})
