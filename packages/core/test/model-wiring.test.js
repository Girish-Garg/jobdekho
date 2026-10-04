import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { decodeModel } from '@jobdekho/core/model/weights.js'
import { levelEstimateFields } from '@jobdekho/core/model/estimate-fields.js'
import { tagsFor } from '@jobdekho/core/tagging.js'
import { tagRow, retagged } from '@jobdekho/core/retag.js'
import { TAGS_VERSION } from '@jobdekho/core/tag.js'

// The level model's wiring, with the hand-made model (version 7) the
// tests hand in; the package itself ships no level model.
const model = decodeModel(JSON.parse(readFileSync(new URL('./fixtures/model-level.json', import.meta.url), 'utf8')))
const mentor = { title: 'Backend Developer', company: 'Acme', description: 'You will mentor engineers across teams and review designs' }

describe('levelEstimateFields', () => {
  it('estimates a posting whose level nothing stated, marked as the model', () => {
    expect(levelEstimateFields(mentor, null, model)).toEqual({
      levelEstimate: {
        range: ['senior', 'staff'], confidence: expect.any(Number), from: 'model', version: 7,
        evidence: "Estimated from: 'mentor engineers', the company's ladder", words: ['mentor engineers'],
      },
      modelVersion: 7,
    })
  })

  // Stated evidence always wins: the board, the title or the text.
  it('never estimates over a level the posting states', () => {
    const stated = { value: 'mid', from: 'text', evidence: 'Asks for 3 years', version: TAGS_VERSION }
    expect(levelEstimateFields(mentor, stated, model)).toEqual({ levelEstimate: null, modelVersion: 7 })
  })

  it('records the model version even when the model abstains', () => {
    expect(levelEstimateFields({ ...mentor, description: 'Short' }, null, model)).toEqual({ levelEstimate: null, modelVersion: 7 })
  })

  it('adds nothing at all when no level model is shipped', () => {
    expect(levelEstimateFields(mentor, null, null)).toEqual({})
  })
})

describe('tagging without a shipped level model', () => {
  const base = {
    title: 'Backend Developer', description: '', company: 'Acme', source: 'greenhouse:acme', location: '', tags: [],
    board: { type: null, employment: null, workMode: null }, experience: null, experienceYears: null, stipend: null,
  }

  it('leaves the level unknown and adds no estimate fields', () => {
    const got = tagsFor({ ...base, description: mentor.description })
    expect(got).toMatchObject({ level: null, levelTag: null })
    expect(got).not.toHaveProperty('levelEstimate')
    expect(got).not.toHaveProperty('modelVersion')
  })

  // Loading the corpus costs nothing for a model that is not there.
  it('loads a current row exactly as it was', () => {
    const current = tagRow({ id: 'p', source: 'greenhouse:acme', title: 'Backend Developer', company: 'Acme', descriptionText: mentor.description })
    expect(retagged(current)).toBe(current)
    expect(retagged({ ...current, modelVersion: 0 })).toEqual({ ...current, modelVersion: 0 })
  })
})

describe('retagged with a level model', () => {
  it('estimates again when only the level model is newer, leaving the rules’ tags alone', () => {
    const stored = tagRow({ id: 'p', source: 'greenhouse:acme', title: 'Backend Developer', company: 'Acme', descriptionText: mentor.description })
    const older = { ...stored, modelVersion: 6, levelEstimate: null }
    const again = retagged(older, model)
    expect(again).toMatchObject({ modelVersion: 7, levelEstimate: { range: ['senior', 'staff'], from: 'model' }, tagsVersion: TAGS_VERSION })
    expect(again.levelTag).toBe(stored.levelTag)
    expect(again.typeTag).toBe(stored.typeTag)
    expect(retagged(again, model)).toBe(again)
  })
})
