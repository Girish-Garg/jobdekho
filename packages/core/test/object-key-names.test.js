import { describe, it, expect } from 'vitest'
import { normalize } from '@jobdekho/core/normalize.js'
import { levelTag } from '@jobdekho/core/level.js'
import { titleMatch, wantedTitles } from '@jobdekho/core/title-match.js'

// Constructor is a real employer, and its key, "constructor", is a name
// every plain object answers to with a function of its own. Two tables
// keyed by company threw on it (graduate-programmes.js, level-ladders.js)
// and failed whole refreshes. Each posting here reaches every table keyed
// by company: a title naming a programme, and a description stating no
// years, which only the company's ladder is left to read.
const COMPANIES = ['Constructor', 'CONSTRUCTOR LTD', 'Constructor Technologies', 'The Constructor', 'toString', 'hasOwnProperty', '__proto__', 'valueOf']
const TITLES = ['Software Engineer', 'Software Engineer - EDG', 'Senior Software Engineer']
const DESCRIPTIONS = ['', 'You will build search services.', 'You will need 3+ years of Node.js.']

const raw = (company, title, description) => ({ externalId: '1', title, company, url: 'https://example.com/1', location: 'Bengaluru', description })

describe('a company named like a property every object has', () => {
  for (const company of COMPANIES) {
    it(`reads a posting from "${company}" like any other`, () => {
      for (const title of TITLES) {
        for (const description of DESCRIPTIONS) expect(() => normalize(raw(company, title, description), 'src')).not.toThrow()
      }
      expect(levelTag({ title: 'Software Engineer', company, description: 'You will build search services.' })).toBeNull()
    })
  }
})

// The title words are the posting's and the person's own: a word every
// object answers to once scored a near title as no match at all.
describe('a title word named like a property every object has', () => {
  it('weighs it like any other word', () => {
    const want = wantedTitles(['Full Stack Developer'])
    expect(titleMatch('Software Engineer, Constructor', want).value).toBe(titleMatch('Software Engineer, Search', want).value)
    expect(titleMatch('Software Engineer, Search', want).value).toBeGreaterThan(0)
    expect(titleMatch('Frontend Engineer', wantedTitles(['Constructor Engineer'])).value).toBe(0.5)
  })
})
