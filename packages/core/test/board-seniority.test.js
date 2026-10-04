import { describe, it, expect } from 'vitest'
import { levelTag } from '@jobdekho/core/level.js'
import { filter } from '@jobdekho/core/filter.js'
import { boardOf } from '@jobdekho/core/board-fields.js'

// Instahyre files every job under its own experience levels, and its search
// carries no description: a title alone made an "SDE 1" asking 6 to 9 years
// an Entry job. The board's filing (sources' boards/instahyre-slices.js) is
// believed over a title that reads as entry or internship.
const board = (seniority) => ({ type: 'job', employment: 'full_time', workMode: null, seniority })
const level = (title, seniority) => levelTag({ title, source: 'instahyre', board: board(seniority) })

describe('a board that files the experience it asks', () => {
  it('keeps a title that reads as entry from calling a job above entry level Entry', () => {
    expect(level('SDE 1', 'above-entry')).toBeNull()
    expect(level('Junior Data Engineer', 'above-entry')).toBeNull()
    expect(level('SDE Intern (Full - Stack)', 'above-entry')).toBeNull()
  })

  it('leaves a title that says more senior as it is', () => {
    expect(level('Senior Software Engineer', 'above-entry')).toMatchObject({ value: 'senior', from: 'title' })
  })

  it('makes a job the board files as entry level Entry, saying so', () => {
    expect(level('Frontend Engineer', 'entry')).toMatchObject({ value: 'entry', from: 'board', evidence: 'Instahyre lists it as entry level' })
    expect(level('SDE 1', 'entry')).toMatchObject({ value: 'entry', from: 'title' })
    expect(level('Staff Engineer', 'entry')).toMatchObject({ value: 'staff' })
  })

  it('reads the title alone where the board says nothing', () => {
    expect(level('SDE 1', null)).toMatchObject({ value: 'entry', from: 'title' })
  })

  it('keeps only the filings it knows', () => {
    expect(boardOf({ type: 'job', seniority: 'above-entry' }).seniority).toBe('above-entry')
    expect(boardOf({ type: 'job', seniority: 'mid_senior' }).seniority).toBeNull()
  })
})

describe('a level filter and a job filed above entry level', () => {
  const posting = { title: 'SDE 1', company: 'Acme', location: 'Bengaluru, India', tags: [], descriptionSnippet: '', level: null, board: board('above-entry') }
  const passes = (levels, row = posting) => filter(row, { levels })

  it('keeps it out of a search for internships or entry roles, though its level is unknown', () => {
    expect(passes(['entry'])).toBe(false)
    expect(passes(['internship', 'entry'])).toBe(false)
  })

  it('lets it into a search that reaches past entry, as an unknown level', () => {
    expect(passes(['entry', 'mid'])).toBe(true)
    expect(passes(['senior'])).toBe(true)
  })

  it('changes nothing for an unknown level the board says nothing about', () => {
    expect(passes(['entry'], { ...posting, board: board(null) })).toBe(true)
  })
})
