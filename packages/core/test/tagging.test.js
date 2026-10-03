import { describe, it, expect } from 'vitest'
import { tagsFor } from '@jobdekho/core/tagging.js'
import { tagRow, retagged } from '@jobdekho/core/retag.js'
import { TAGS_VERSION } from '@jobdekho/core/tag.js'

const posting = (over = {}) => ({
  title: 'Software Engineer', description: '', company: 'Acme', source: 'greenhouse:acme',
  board: { type: null, employment: null, workMode: null }, location: 'Bengaluru, India', tags: [],
  experience: null, experienceYears: null, stipend: null, ...over,
})

describe('tagsFor', () => {
  it('leaves what nothing states unknown, with no default', () => {
    const got = tagsFor(posting())
    expect(got).toMatchObject({ level: null, levelTag: null, type: 'job', typeTag: null, workMode: null, workModeTag: null })
    expect(got).toMatchObject({ stipend: null, payTag: null, caution: [], fewDetails: false, adKey: null, tagsVersion: TAGS_VERSION })
  })

  it('gives each tag its evidence', () => {
    const got = tagsFor(posting({
      title: 'Senior Backend Engineer (Hybrid)', description: 'Salary: $120k - $150k per year', board: { type: 'job', employment: 'FullTime', workMode: null },
    }))
    expect(got.levelTag).toMatchObject({ value: 'senior', from: 'title', evidence: 'Title says Senior' })
    expect(got.typeTag).toMatchObject({ value: 'job', from: 'board', evidence: 'Employment type: Full Time' })
    expect(got.workModeTag).toMatchObject({ value: 'hybrid', from: 'title' })
    expect(got).toMatchObject({ stipend: '$120k - $150k /year', currency: 'USD', payTag: { from: 'text' } })
  })

  it('makes a board-listed internship an internship type too', () => {
    const got = tagsFor(posting({ title: 'React Native Development', source: 'internshala', board: { type: 'internship' } }))
    expect(got).toMatchObject({ level: 'internship', type: 'internship', typeTag: { from: 'board' } })
  })

  it('raises Caution only on a board, never a careers site', () => {
    const fee = 'Selected candidates must pay a registration fee of Rs 1500.'
    expect(tagsFor(posting({ description: fee, source: 'linkedin' })).caution).toHaveLength(1)
    expect(tagsFor(posting({ description: fee })).caution).toEqual([])
  })
})

describe('tagRow and retagged', () => {
  const stored = {
    id: 'p1', source: 'internshala', title: 'React Native Development', company: 'Acme', tags: ['internship'],
    descriptionText: 'Build apps.', stipend: '₹ 10,000 /month', level: 'mid', workMode: 'onsite', type: 'job',
    features: { v: 1, skills: {}, band: [1, 4], from: 'title', titleLevel: 'mid' },
  }

  // Rows from before the tags existed are tagged from what they kept.
  it('tags an old row from its text and the list it came from', () => {
    const got = retagged(stored)
    expect(got).toMatchObject({ level: 'internship', type: 'internship', workMode: null, tagsVersion: TAGS_VERSION })
    expect(got.board).toEqual({ type: 'internship', employment: null, workMode: null })
    expect(got.payTag).toMatchObject({ from: 'board', value: '₹ 10,000 /month' })
    // The fit's title reading follows the shared title rules.
    expect(got.features).toMatchObject({ band: null, from: null, titleLevel: null, skills: {} })
  })

  it('leaves a current row as it is', () => {
    const current = retagged(stored)
    expect(retagged(current)).toBe(current)
  })

  // One hand-edited row must not fail the whole corpus as it loads.
  it('loads a row the rules cannot read as it was', () => {
    const broken = { id: 'x', title: 'Engineer', tags: 'not a list', location: 'Pune' }
    expect(retagged(broken)).toBe(broken)
  })

  // Pay the text stated is read again from the text, never taken for the board's.
  it('reads text pay again from the text', () => {
    const row = { ...stored, source: 'linkedin', tags: [], descriptionText: 'Stipend: ₹12,000 per month', stipend: '₹10,000 /month', payTag: { from: 'text' } }
    expect(tagRow(row)).toMatchObject({ stipend: '₹12,000 /month', payTag: { from: 'text' } })
  })
})
