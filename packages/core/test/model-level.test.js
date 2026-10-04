import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { decodeModel } from '@jobdekho/core/model/weights.js'
import { logits, softmax, pushes } from '@jobdekho/core/model/linear.js'
import { estimateLevel, bestPair, scoreLevel } from '@jobdekho/core/model/level-estimate.js'
import { levelEvidence } from '@jobdekho/core/model/level-evidence.js'
import { levelFeatures } from '@jobdekho/core/model/level-features.js'

// A hand-made model (fixtures/model-level.json): "stipend" means an
// internship or a first job, "mentor engineers" means senior or staff, the
// title word "engineer" means mid or senior, a pair no threshold lets out.
const json = JSON.parse(readFileSync(new URL('./fixtures/model-level.json', import.meta.url), 'utf8'))
const model = decodeModel(json)

const posting = (over = {}) => ({ title: 'Backend Developer', company: 'Acme', description: 'You will mentor engineers across teams and review designs', ...over })

describe('decodeModel and the linear layer', () => {
  it('turns stored integers back into weights', () => {
    expect(model.K).toBe(6)
    expect(model.W[0]).toBe(20)
    expect(model.index.get('c:acme')).toBe(4)
    expect(Array.from(logits(model, new Map([['d:stipend', 0.5], ['unknown', 1]])))).toEqual([10, 9, 0, -3, -4, -4.5])
  })

  it('refuses a file whose weights do not fit its features', () => {
    expect(() => decodeModel({ ...json, weights: json.weights.slice(1) })).toThrow(/weights/)
  })

  it('softens scores by the temperature', () => {
    const sharp = softmax([2, 0], 1)
    const soft = softmax([2, 0], 2)
    expect(sharp[0]).toBeGreaterThan(soft[0])
    expect(sharp[0] + sharp[1]).toBeCloseTo(1)
  })

  it('ranks the features that pushed toward the chosen classes', () => {
    const named = pushes(model, levelFeatures(posting()), [3, 4]).map((p) => p.name)
    expect(named.slice(0, 3)).toEqual(['d:mentor engineers', 'd:mentor', 'c:acme'])
  })
})

describe('bestPair', () => {
  it('picks the adjacent pair holding the most probability', () => {
    const best = bestPair([0.05, 0.05, 0.4, 0.45, 0.04, 0.01])
    expect(best.lo).toBe(2)
    expect(best.confidence).toBeCloseTo(0.85)
    expect(bestPair([0.6, 0.1, 0, 0, 0.3, 0]).lo).toBe(0)
  })
})

describe('estimateLevel', () => {
  it('estimates a range with its confidence, version and evidence', () => {
    const estimate = estimateLevel(posting(), model)
    expect(estimate).toMatchObject({ range: ['senior', 'staff'], version: 7, evidence: "Estimated from: 'mentor engineers', the company's ladder", words: ['mentor engineers'] })
    expect(estimate.confidence).toBeGreaterThan(0.8)
    expect(estimate.confidence).toBeLessThan(1)
  })

  it('reads a stored row by its descriptionText too', () => {
    const { description, ...rest } = posting({ description: 'We pay a monthly stipend to students who join the team' })
    expect(estimateLevel({ ...rest, descriptionText: description }, model)?.range).toEqual(['internship', 'entry'])
  })

  it('stays silent below the pair threshold', () => {
    expect(estimateLevel(posting({ description: 'Join a friendly team building useful things together' }), model)).toBeNull()
  })

  it('never shows a pair that has no threshold, however sure', () => {
    const scored = scoreLevel(posting({ title: 'Engineer', description: 'Join a friendly team building useful things together' }), model)
    expect(scored).toMatchObject({ lo: 2, threshold: null })
    expect(scored.confidence).toBeGreaterThan(0.99)
    expect(estimateLevel(posting({ title: 'Engineer', description: 'Join a friendly team building useful things together' }), model)).toBeNull()
  })

  it('says nothing about a posting with too little text, or without a model', () => {
    expect(estimateLevel(posting({ description: 'Mentor engineers' }), model)).toBeNull()
    expect(estimateLevel(posting(), null)).toBeNull()
  })
})

describe('levelEvidence', () => {
  it('names title words and the company, and quotes at most two phrases', () => {
    const got = levelEvidence([
      { name: 't:data' }, { name: 'd:mentor engineers' }, { name: 'd:mentor' }, { name: 'c:acme' }, { name: 'd:roadmap' },
    ])
    expect(got).toEqual({ evidence: "Estimated from: title words, 'mentor engineers', the company's ladder", words: ['data', 'mentor engineers'] })
    expect(levelEvidence([]).evidence).toBe("Estimated from the posting's words")
  })
})
