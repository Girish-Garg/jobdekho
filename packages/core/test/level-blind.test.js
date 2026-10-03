import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { tagRow } from '@jobdekho/core/retag.js'

// The level study's two blind samples, frozen: 100 stored postings drawn at
// random and 60 held out from an older copy, each labelled by hand with the
// levels a careful reader accepts before either rule set was run. They are
// tagged the way a stored posting is (retag.js), from the fields it keeps.
//
// The floors are what the rules scored when the fixture was frozen. A change
// that loses a sample has to be argued for, not slipped in.
const samples = JSON.parse(readFileSync(new URL('./fixtures/level-blind-samples.json', import.meta.url), 'utf8'))
const FLOOR = { current: 94 / 94, holdout: 53 / 53 }

function score(rows) {
  const labelled = rows.filter((row) => row.accept)
  const misses = labelled.filter((row) => !row.accept.includes(tagRow(row).level))
  return { labelled: labelled.length, accuracy: (labelled.length - misses.length) / labelled.length, misses: misses.map((r) => r.title) }
}

describe('the frozen blind samples', () => {
  it('hold the postings the study labelled', () => {
    expect(samples.current).toHaveLength(100)
    expect(samples.holdout).toHaveLength(60)
  })

  for (const name of ['current', 'holdout']) {
    it(`score at or above the floor on the ${name} sample`, () => {
      const result = score(samples[name])
      expect(result.misses).toEqual([])
      expect(result.accuracy).toBeGreaterThanOrEqual(FLOOR[name])
    })
  }

  // A posting a careful reader could not place is never given a level that
  // a later rule could only have guessed: it may be unknown, never "mid" by
  // default.
  it('never fills in a level as a default', () => {
    for (const row of [...samples.current, ...samples.holdout]) {
      const level = tagRow(row)
      if (level.level) expect(level.levelTag.evidence).toBeTruthy()
    }
  })
})
