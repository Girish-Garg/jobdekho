import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { blockCompany } from '@jobdekho/store/blocked-companies.js'
import { readBlocked } from '../src/blocked.js'
import { hasCareersSource, withoutCareersOf } from '../src/careers-source.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-blocked-run-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

// A config/companies.json in small: two platform boards, one named and one
// known only by its slug, a company's own site, and the job boards.
const SOURCES = {
  providers: [
    { provider: 'greenhouse', slug: 'acmefoundation', company: 'Acme Foundation' },
    { provider: 'smartrecruiters', slug: 'WesternDigital' },
    { provider: 'workday', url: 'https://beta.wd3.myworkdayjobs.com/Careers', company: 'Beta Corp' },
  ],
  companies: ['hdfcbank', 'amazon'],
  boards: ['internshala', 'linkedin'],
}

describe('readBlocked', () => {
  it('says which postings are blocked, under any spelling, and which careers pages are stopped', () => {
    const db = openStore(dir)
    blockCompany(db, 'local', { name: 'Acme Foundation', stopFetching: true })
    blockCompany(db, 'local', { name: 'Western Digital', stopFetching: false })
    const blocked = readBlocked(db, 'local')
    expect(blocked.isBlocked({ company: 'ACME FOUNDATION PVT LTD' })).toBe(true)
    expect(blocked.isBlocked({ company: 'WesternDigital' })).toBe(true)
    expect(blocked.isBlocked({ company: 'Acme' })).toBe(false)
    expect(blocked.isBlocked(null)).toBe(false)
    expect([...blocked.stopped]).toEqual(['acmefoundation'])
  })

  // No user to ask (a test, a script) is nobody's block.
  it('blocks nothing without a user, or for one who blocked nothing', () => {
    const db = openStore(dir)
    blockCompany(db, 'local', { name: 'Acme Foundation', stopFetching: true })
    for (const blocked of [readBlocked(db, null), readBlocked(db, 'someone')]) {
      expect(blocked.isBlocked({ company: 'Acme Foundation' })).toBe(false)
      expect(blocked.stopped.size).toBe(0)
    }
  })
})

describe('hasCareersSource', () => {
  it('finds a company\'s own board by its name or its slug, and its own site by name', () => {
    expect(hasCareersSource(SOURCES, 'acmefoundation')).toBe(true)
    expect(hasCareersSource(SOURCES, 'westerndigital')).toBe(true)
    expect(hasCareersSource(SOURCES, 'beta')).toBe(true)
    expect(hasCareersSource(SOURCES, 'hdfcbank')).toBe(true)
  })

  // A board carries many companies and belongs to none of them.
  it('finds none for a company that only job boards carry, or for no key at all', () => {
    expect(hasCareersSource(SOURCES, 'internshala')).toBe(false)
    expect(hasCareersSource(SOURCES, 'gamma')).toBe(false)
    expect(hasCareersSource(SOURCES, '')).toBe(false)
    expect(hasCareersSource({}, 'acmefoundation')).toBe(false)
  })
})

describe('withoutCareersOf', () => {
  it('leaves out the stopped companies\' own sources and keeps every job board', () => {
    const left = withoutCareersOf(SOURCES, new Set(['acmefoundation', 'westerndigital', 'hdfcbank']))
    expect(left.providers.map((entry) => entry.slug ?? entry.company)).toEqual(['Beta Corp'])
    expect(left.companies).toEqual(['amazon'])
    expect(left.boards).toEqual(SOURCES.boards)
  })

  it('hands the config back as it was when nothing is stopped', () => {
    expect(withoutCareersOf(SOURCES, new Set())).toBe(SOURCES)
  })
})
