import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore, FILES } from '@jobdekho/store/open.js'
import { fromPgRow } from '@jobdekho/store/pg-row.js'
import { importPgExport } from '@jobdekho/store/import-pg.js'
import { upsertProfile, getProfile } from '@jobdekho/store/profiles.js'
import { listPostingsForUser } from '@jobdekho/store/dashboard.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const exported = {
  id: '128194f2b2a1585e', source: 'greenhouse:phonepe', external_id: '7884266003',
  title: 'Engineering Manager', company: 'Phonepe', location: 'Bangalore', url: 'https://x',
  description_snippet: 'snip', tags: ['Engineering Development'], posted_at: '2026-08-18T04:34:15.000Z',
  first_seen_at: '2026-08-23T11:09:37.542Z', status: 'new', stipend: null, duration: null, experience: null,
  type: 'job', level: 'senior', degree_min: 'bachelors', degree_required: false, work_mode: 'onsite',
  stipend_min: null, duration_months: null, experience_years: null, group_key: 'engineering manager|phonepe',
  last_seen_at: '2026-08-24 20:14:48.079', currency: null, description_text: 'full text',
}

describe('fromPgRow', () => {
  it('maps the column names, drops the dead status column and canonicalises timestamps', () => {
    const row = fromPgRow(exported)
    expect(row).toEqual({
      id: '128194f2b2a1585e', source: 'greenhouse:phonepe', externalId: '7884266003',
      title: 'Engineering Manager', company: 'Phonepe', location: 'Bangalore', url: 'https://x',
      descriptionSnippet: 'snip', tags: ['Engineering Development'], postedAt: '2026-08-18T04:34:15.000Z',
      firstSeenAt: '2026-08-23T11:09:37.542Z', stipend: null, duration: null, experience: null,
      type: 'job', level: 'senior', degreeMin: 'bachelors', degreeRequired: false, workMode: 'onsite',
      stipendMin: null, durationMonths: null, experienceYears: null, groupKey: 'engineering manager|phonepe',
      lastSeenAt: new Date('2026-08-24 20:14:48.079').toISOString(), currency: null, descriptionText: 'full text',
    })
    expect(row).not.toHaveProperty('status')
  })
})

describe('importPgExport', () => {
  it('replaces the corpus and leaves the profile alone', async () => {
    const store = openStore(dir)
    await upsertProfile(store, 'me', { skills: ['python'], resumeText: 'RAW' })
    const second = { ...exported, id: 'second', title: 'Second', group_key: 'second|phonepe' }
    const lines = [exported, second].map((r) => JSON.stringify(r)).join('\n')
    expect(importPgExport(store, lines)).toBe(2)
    const page = await listPostingsForUser(store, 'me', { includeStale: true, sort: 'company' })
    expect(page.map((p) => p.id).sort()).toEqual(['128194f2b2a1585e', 'second'])
    expect(page[0]).not.toHaveProperty('status', 'new')
    expect(await getProfile(store, 'me')).toMatchObject({ skills: ['python'] })
    expect(readFileSync(join(dir, FILES.corpus), 'utf8')).not.toContain('RAW')
  })
})
