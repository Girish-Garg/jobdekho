import { readFileSync } from 'node:fs'
import { describe, it, expect, vi } from 'vitest'
import { parseInternshalaDetail, keepReadPages } from '@jobdekho/sources/boards/internshala-detail.js'
import { internshala } from '@jobdekho/sources/boards/internshala.js'
import { describable, describePosting } from '@jobdekho/sources/describe.js'

// The details box of two live pages, 2026-10-06: an internship and a job.
const page = (name) => readFileSync(new URL(`./fixtures/internshala-${name}.html`, import.meta.url), 'utf8')

describe('parseInternshalaDetail', () => {
  it('reads an internship page whole, each section under its heading', () => {
    const text = parseInternshalaDetail(page('internship'))
    expect(text.startsWith('About the internship\n\nAs a React Native Development intern at Krazio Cloud')).toBe(true)
    for (const heading of ['Skill(s) required', 'Who can apply', 'Perks', 'Number of openings', 'About Krazio Cloud']) expect(text).toContain(`\n\n${heading}\n\n`)
    expect(text).toContain('Certificate, Letter of recommendation')
    expect(text.length).toBeGreaterThan(1000)
    expect(text).not.toMatch(/Activity on Internshala/)
  })

  it('reads a job page the same way, salary and all', () => {
    const text = parseInternshalaDetail(page('job'))
    expect(text.startsWith('About the job\n\nKey Responsibilities:')).toBe(true)
    expect(text).toContain('Salary\n\nAnnual CTC')
    expect(text).toContain('Java, PLC Programming, SQL')
  })

  it('reads nothing from a page without the details box', () => {
    expect(parseInternshalaDetail('<html><body><p>Gone</p></body></html>')).toBe('')
  })
})

const card = (id) => ({ externalId: String(id), url: `https://internshala.com/internship/detail/x${id}`, description: 'As an intern you will' })
const pageHttp = () => vi.fn(async () => ({ text: async () => page('internship') }))

describe('keepReadPages', () => {
  // A page read once is kept: the card's first line must not replace it.
  it('sends a card whose page was read bare, and the rest as they came', () => {
    const context = { known: (name, id) => id === '1' }
    const [read, fresh] = keepReadPages([card(1), card(2)], { name: 'internshala', context })
    expect(read.description).toBe('')
    expect(fresh.description).toBe('As an intern you will')
  })
})

// The page is read when the person opens the posting, as LinkedIn's are,
// and never by a refresh: one request per posting someone looks at.
describe('an Internshala posting', () => {
  it('is described from its own page when opened', async () => {
    expect(describable('internshala')).toBe(true)
    const { description } = await describePosting({ http: pageHttp() }, { source: 'internshala', externalId: '9', url: 'https://internshala.com/internship/detail/x9' })
    expect(description.startsWith('About the internship')).toBe(true)
  })

  it('costs a refresh no page request', async () => {
    const list = '<div class="individual_internship" internshipid="5"><a class="job-title-href" href="/internship/detail/x5">Dev</a></div>'
    const http = vi.fn(async () => ({ text: async () => list }))
    const rows = await internshala().fetch(http, { known: () => false })
    expect(rows).toHaveLength(20)
    expect(http.mock.calls.every(([url]) => !url.includes('/detail/'))).toBe(true)
  })
})
