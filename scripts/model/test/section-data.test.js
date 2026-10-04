import { describe, it, expect } from 'vitest'
import { labelledLines, sectionExamples } from '../section-data.js'

const labels = (text) => {
  const doc = labelledLines(text)
  return doc.lines.map((line, i) => [line, doc.labels[i]])
}

describe('labelledLines', () => {
  it('labels lines by the heading over them, leaving the headings out', () => {
    expect(labels('Acme builds payments.\nResponsibilities\n- Build APIs\nQualifications\n- Go\nBenefits\n- Health cover')).toEqual([
      ['Acme builds payments.', null], ['- Build APIs', 'duties'], ['- Go', 'requirements'], ['- Health cover', 'pay'],
    ])
  })

  it('trusts only headings specific enough to name one section', () => {
    expect(labels('Job Description\n- Build APIs\nAbout you\n- Go')).toEqual([['- Build APIs', null], ['- Go', 'requirements']])
    expect(labels('Nice to have\n- Rust')).toEqual([['- Rust', 'requirements']])
  })

  it('ends a section at a heading step 1 does not know', () => {
    expect(labels('Responsibilities\n- Build APIs\nDesired Qualifications:\n- Rust')).toEqual([
      ['- Build APIs', 'duties'], ['Desired Qualifications:', null], ['- Rust', null],
    ])
  })

  it('reads a line by its own shape when its heading is likely wrong', () => {
    expect(labels('Responsibilities\n- 3+ years of Go\n- Experience with Kafka\nRequirements\n- Design the billing service')).toEqual([
      ['- 3+ years of Go', 'requirements'], ['- Experience with Kafka', 'requirements'], ['- Design the billing service', null],
    ])
  })

  it('is null for a text with no heading', () => {
    expect(labelledLines('Build APIs. Ship weekly.')).toBeNull()
  })
})

describe('sectionExamples', () => {
  it('takes duties and requirements only from postings that head both', () => {
    const p = (id, description) => ({ id, companyKey: id, description: description.padEnd(320, ' ') })
    const both = sectionExamples([p('a', 'Responsibilities\n- Build APIs\nRequirements\n- Go\nBenefits\n- Health cover')])
    expect(both.map((e) => e.y)).toEqual([0, 1, 2])
    const one = sectionExamples([p('b', 'Responsibilities\n- Build APIs\nBenefits\n- Health cover')])
    expect(one.map((e) => [e.y, e.text])).toEqual([[2, '- Health cover']])
  })
})
