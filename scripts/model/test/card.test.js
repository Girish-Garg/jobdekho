import { describe, it, expect } from 'vitest'
import { levelCard } from '../card-level.js'
import { sectionsCard } from '../card-sections.js'
import { audit } from '../card-parts.js'

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`)
const files = [{ file: 'postings.ndjson', date: '2026-10-03', rows: 10, added: 10 }]
const target = (t) => ({
  target: t,
  thresholds: { 'internship-entry': 0.9, 'mid-senior': null },
  heldOut: { covered: 5, right: 5, precision: 1, coverage: 0.5 },
  heldOutTitleSaidNothing: { covered: 4, right: 4, precision: 1 },
  thresholdsChosenWithoutTheTestFold: { covered: 5, right: 5, precision: 1 },
  byPair: { 'internship-entry': { threshold: 0.9, covered: 5, right: 5, precision: 1, unknown: 0 }, 'mid-senior': { threshold: null, covered: 0, right: 0, precision: null, unknown: 0 } },
  unknown: { covered: 0 },
})
const level = {
  version: 3, weightsBytes: 2048, temperature: 1.1, minSupport: 50, split: { folds: 5, seed: 1 },
  training: { kept: 100, minWords: 60 },
  shipped: false,
  data: { files, tagsVersion: 2, postings: 10, trainedOn: 10, companies: 4, levels: { senior: 6, mid: 4 }, levelFrom: { title: 10 }, unknown: 2, unknownWithText: 1 },
  heldOut: { postings: 10 }, chosen: target(0.995), alternative: target(0.98),
  lowerTargets: [{ target: 0.9, thresholds: { 'senior-staff': 0.8 }, heldOut: { covered: 8, precision: 0.9 }, unknown: { covered: 1 } }],
  globalThresholds: [{ threshold: 0.9, heldOutCoverage: 0.5, precision: 0.95, wrong: 1, unknownCovered: 1, unknownCoverage: 0.5 }],
}

describe('the model card', () => {
  it('records what the level model does, its numbers and its version, without dashes', () => {
    const text = levelCard(level, null)
    expect(text).toContain('- Status: not shipped: no unknown posting reaches the bar.')
    expect(text).toContain('tag version 2')
    expect(text).toContain('- Version: 3')
    expect(text).toContain('| internship to entry | 0.9 | 5 | 100.0% | 0 |')
    expect(text).toContain('| mid to senior | never shown | 0 | n/a | 0 |')
    expect(text).toContain('- Audit: not yet audited.')
    expect(text).not.toMatch(DASHES)
  })

  it('records the section model the same way', () => {
    const sections = {
      ...level, version: 4, heldOut: { lines: 10 },
      data: { files, trainedOn: 10, headedPostings: 3, companies: 2, lines: { duties: 6, requirements: 4 } },
      chosen: { ...target(0.995), byKind: { duties: { threshold: 0.98, covered: 5, right: 5, precision: 1 } } },
      alternative: { ...target(0.98), byKind: { duties: { threshold: 0.9, covered: 8, right: 8, precision: 1 } } },
      globalThresholds: [{ threshold: 0.9, coverage: 0.5, precision: 0.95, wrong: 1 }],
      unheaded: { postings: 5, sorted: 3, sortedShare: 0.6, lines: 40, placedLines: 10, placedShare: 0.25, placed: { duties: 10 } },
    }
    const text = sectionsCard(sections, null)
    expect(text).toContain('- Status: shipped, but off in the app until the owner')
    expect(sectionsCard(sections, { version: 4, passed: true, samples: 150, errors: 0, lowerBound: 0.9802, reviewedAt: '2026-10-06' })).toContain('- Status: shipped, and on in the app')
    expect(text).toContain('- Version: 4')
    expect(text).toContain('| duties | 0.98 | 5 | 100.0% |')
    expect(text).not.toMatch(DASHES)
  })

  it('writes a finished review as its bound and whether the claim holds', () => {
    expect(audit({ version: 1, passed: true, samples: 236, errors: 1, lowerBound: 0.9800, reviewedAt: '2026-10-05' }))
      .toBe('- Audit: the owner checked 236 outputs on 2026-10-05 (version 1):\n  1 wrong, precision 99.6%, one-sided 95% lower bound 98.00%.\n  The 98% claim passes.')
  })
})
