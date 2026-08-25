import { describe, it, expect } from 'vitest'
import { ghostSignals, legitimacy } from '@jobdekho/core/ghost.js'

const NOW = new Date('2026-08-25')

// A posting nothing should complain about: pay stated, fresh, a real
// description naming real tools, no duplicates.
const solid = (over) => ({
  title: 'Backend Developer',
  company: 'Acme',
  stipend: 'INR 25,000 /month',
  stipendMin: 25000,
  descriptionText: 'We are hiring a backend developer to build services with node and postgresql for us. '.repeat(12),
  descriptionSnippet: 'We are hiring a backend developer.',
  postedAt: '2026-08-10',
  groupCount: 1,
  tags: [],
  ...over,
})

// Long enough that saying nothing specific is a choice, and free of every
// term the tool lexicon knows.
const vague = 'This is an exciting opportunity for a dynamic and motivated candidate to join our growing team today. '.repeat(12)

describe('ghostSignals', () => {
  it('finds nothing wrong with a solid posting', () => {
    expect(ghostSignals(solid(), NOW)).toEqual([])
  })

  // A board that never published a date said nothing about age. Reading the
  // absence as staleness would flag every posting from such a board.
  it('does not read a missing or unparseable date as staleness', () => {
    expect(ghostSignals(solid({ postedAt: null }), NOW)).toEqual([])
    expect(ghostSignals(solid({ postedAt: 'a few days ago' }), NOW)).toEqual([])
  })

  // Rows scraped before descriptionText existed carry only the 280 character
  // snippet. Reading that as "JD under 150 words" would flag most of the
  // historical database in one stroke.
  it('does not read a legacy snippet-only row as a thin description', () => {
    expect(ghostSignals(solid({ descriptionText: undefined }), NOW)).toEqual([])
    expect(ghostSignals(solid({ descriptionText: '' }), NOW)).toEqual([])
  })

  it('flags a genuinely short full description', () => {
    const s = ghostSignals(solid({ descriptionText: 'Great react opportunity, apply fast.' }), NOW)
    expect(s).toEqual(['very short job description'])
  })

  it('flags undisclosed pay but not pay it merely failed to parse', () => {
    expect(ghostSignals(solid({ stipend: null, stipendMin: null }), NOW)).toEqual(['no pay stated'])
    expect(ghostSignals(solid({ stipend: 'Performance based', stipendMin: null }), NOW)).toEqual([])
  })

  it('speaks age in months, and only past ninety days', () => {
    expect(ghostSignals(solid({ postedAt: '2026-05-27' }), NOW)).toEqual([])
    expect(ghostSignals(solid({ postedAt: '2026-05-26' }), NOW)).toEqual(['posted 3 months ago'])
    expect(ghostSignals(solid({ postedAt: '2026-04-27' }), NOW)).toEqual(['posted 4 months ago'])
    expect(ghostSignals(solid({ postedAt: '2025-06-01' }), NOW)).toEqual(['posted over a year ago'])
  })

  it('flags a long description that names nothing specific', () => {
    expect(ghostSignals(solid({ descriptionText: vague }), NOW))
      .toEqual(['no specific skills or tools named'])
  })

  // The employer being specific anywhere is enough; the signal is about what
  // was said, not where.
  it('is silenced by a tool in the body, the title, or the board tags', () => {
    expect(ghostSignals(solid({ descriptionText: `${vague} You will use excel daily.` }), NOW)).toEqual([])
    expect(ghostSignals(solid({ descriptionText: vague, title: 'React Developer' }), NOW)).toEqual([])
    expect(ghostSignals(solid({ descriptionText: vague, tags: ['python'] }), NOW)).toEqual([])
  })

  it('counts a blast-posted role only at five or more boards', () => {
    expect(ghostSignals(solid({ groupSourceCount: 4 }), NOW)).toEqual([])
    expect(ghostSignals(solid({ groupSourceCount: 6 }), NOW)).toEqual(['listed on 6 job boards'])
    expect(ghostSignals(solid({ groupSourceCount: undefined }), NOW)).toEqual([])
  })

  // One role advertised in six cities is six postings from ONE board, and a
  // real employer hiring in six offices. Counting postings would accuse them.
  it('does not read one role listed in many cities as a blast', () => {
    expect(ghostSignals(solid({ groupCount: 9, groupSourceCount: 1 }), NOW)).toEqual([])
  })
})

describe('legitimacy', () => {
  it('maps signal counts onto the four level scale', () => {
    expect(legitimacy(solid(), NOW)).toBe('high')
    expect(legitimacy(solid({ stipend: null }), NOW)).toBe('medium')
    expect(legitimacy(solid({ stipend: null, postedAt: '2026-01-01' }), NOW)).toBe('low')
    expect(legitimacy(solid({ stipend: null, postedAt: '2026-01-01', groupSourceCount: 7 }), NOW))
      .toBe('suspicious')
  })

  // With date, text and duplicate count all absent, at most one honest signal
  // remains, so missing data alone can never push a posting into the accusing
  // half of the scale.
  it('never sinks a data-poor posting below medium on absence alone', () => {
    const bare = { title: 'Developer', company: '', stipend: null }
    expect(ghostSignals(bare, NOW)).toEqual(['no pay stated'])
    expect(legitimacy(bare, NOW)).toBe('medium')
  })
})
