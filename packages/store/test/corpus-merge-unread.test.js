import { describe, it, expect, vi } from 'vitest'
import { refreshed } from '@jobdekho/store/corpus-merge.js'

// A rule that throws on one posting, the way core's level-ladders.js once
// did on a company named Constructor.
vi.mock('@jobdekho/core/retag.js', async (importOriginal) => {
  const real = await importOriginal()
  const tagRow = (row) => {
    if (row.company === 'Broken') throw new TypeError('a rule broke')
    return real.tagRow(row)
  }
  return { ...real, tagRow }
})

describe('refreshed, when the rules cannot read the kept text', () => {
  // A bare sighting is tagged again from the kept text inside the scrape's
  // one write, so a throw there would lose every source's postings.
  it('keeps the tags the row had and takes the sighting', () => {
    const stored = {
      id: 'p1', company: 'Broken', title: 'Engineer', descriptionText: 'Full text', level: 'mid',
      board: { type: 'job', employment: null, workMode: null, seniority: 'entry' }, lastSeenAt: '2026-09-01T00:00:00.000Z',
    }
    const sighting = { ...stored, title: 'Engineer II', descriptionText: null, board: { type: 'job' }, lastSeenAt: '2026-09-30T00:00:00.000Z' }
    const next = refreshed(stored, sighting)
    expect(next).toMatchObject({ title: 'Engineer II', descriptionText: 'Full text', level: 'mid', lastSeenAt: '2026-09-30T00:00:00.000Z' })
    expect(next.board.seniority).toBe('entry')
  })
})
