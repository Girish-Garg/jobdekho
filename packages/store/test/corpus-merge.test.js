import { describe, it, expect } from 'vitest'
import { refreshed, markSeen } from '@jobdekho/store/corpus-merge.js'

const stored = {
  id: 'p1', title: 'Engineer', descriptionText: 'Full text', logoUrl: 'https://media.licdn.com/a.png',
  lastSeenAt: '2026-09-01T00:00:00.000Z', firstSeenAt: '2026-08-01T00:00:00.000Z',
}

describe('refreshed', () => {
  it('keeps a stored logo when the new sighting has none', () => {
    const next = refreshed(stored, { ...stored, logoUrl: null, lastSeenAt: '2026-09-30T00:00:00.000Z' })
    expect(next.logoUrl).toBe(stored.logoUrl)
    expect(next.lastSeenAt).toBe('2026-09-30T00:00:00.000Z')
  })

  it('takes a new logo when the sighting brings one', () => {
    expect(refreshed(stored, { ...stored, logoUrl: 'https://media.licdn.com/b.png' }).logoUrl).toBe('https://media.licdn.com/b.png')
  })

  it('still keeps the text a bare card would wipe', () => {
    expect(refreshed(stored, { ...stored, descriptionText: null }).descriptionText).toBe('Full text')
  })

  // The tags were read from the text, which a bare card never had: they are
  // read again from the kept text, with the card's newer title.
  it('tags a bare sighting again from the kept text', () => {
    const kept = { ...stored, source: 'linkedin', descriptionText: 'Workplace type: Hybrid\n- 3+ years of Go', level: null, workMode: null }
    const next = refreshed(kept, { ...kept, title: 'Senior Engineer', descriptionText: null, level: null, workMode: null, levelTag: null })
    expect(next).toMatchObject({ descriptionText: kept.descriptionText, level: 'senior', workMode: 'hybrid', workModeTag: { from: 'text' } })
  })

  // LinkedIn's employment type comes with its page, never with a card.
  it('keeps the parts of the board a bare card leaves out', () => {
    const kept = { ...stored, source: 'linkedin', board: { type: 'job', employment: 'Full-time', workMode: null } }
    const next = refreshed(kept, { ...kept, descriptionText: null, board: { type: null, employment: null, workMode: 'remote' } })
    expect(next.board).toEqual({ type: 'job', employment: 'Full-time', workMode: 'remote' })
    expect(next.typeTag).toMatchObject({ value: 'job', evidence: 'Employment type: Full-time' })
  })

  it('takes the new tags from a sighting that brings its own text', () => {
    const next = refreshed(stored, { ...stored, descriptionText: 'New text', level: 'staff', levelTag: { value: 'staff' }, tagsVersion: 2 })
    expect(next).toMatchObject({ level: 'staff', levelTag: { value: 'staff' }, tagsVersion: 2 })
  })
})

// A posting a source listed but skipped as already stored was still seen:
// its lastSeenAt has to move, or the feed hides it after 21 days.
describe('markSeen', () => {
  it('moves lastSeenAt on for listed postings the store holds, and only those', () => {
    const rows = new Map([['p1', stored], ['p2', { ...stored, id: 'p2' }]])
    markSeen(rows, ['p1', 'gone'], '2026-09-30T12:00:00.000Z')
    expect(rows.get('p1').lastSeenAt).toBe('2026-09-30T12:00:00.000Z')
    expect(rows.get('p1').firstSeenAt).toBe(stored.firstSeenAt)
    expect(rows.get('p2').lastSeenAt).toBe(stored.lastSeenAt)
    expect(rows.has('gone')).toBe(false)
  })
})
