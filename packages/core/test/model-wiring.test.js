import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { decodeModel } from '@jobdekho/core/model/weights.js'
import { levelEstimateFields } from '@jobdekho/core/model/estimate-fields.js'
import { LEVEL_MODEL_VERSION } from '@jobdekho/core/model/version.js'
import { tagsFor } from '@jobdekho/core/tagging.js'
import { tagRow, retagged } from '@jobdekho/core/retag.js'
import { TAGS_VERSION } from '@jobdekho/core/tag.js'

const model = decodeModel(JSON.parse(readFileSync(new URL('./fixtures/model-level.json', import.meta.url), 'utf8')))
const mentor = { title: 'Backend Developer', company: 'Acme', description: 'You will mentor engineers across teams and review designs' }

describe('levelEstimateFields', () => {
  it('estimates a posting whose level nothing stated, marked as the model', () => {
    expect(levelEstimateFields(mentor, null, model)).toEqual({
      levelEstimate: {
        range: ['senior', 'staff'], confidence: expect.any(Number), from: 'model', version: 7,
        evidence: "Estimated from: 'mentor engineers', the company's ladder", words: ['mentor engineers'],
      },
      modelVersion: LEVEL_MODEL_VERSION,
    })
  })

  // Stated evidence always wins: the board, the title or the text.
  it('never estimates over a level the posting states', () => {
    const stated = { value: 'mid', from: 'text', evidence: 'Asks for 3 years', version: TAGS_VERSION }
    expect(levelEstimateFields(mentor, stated, model)).toEqual({ levelEstimate: null, modelVersion: LEVEL_MODEL_VERSION })
  })

  it('records the model version even when the model abstains', () => {
    expect(levelEstimateFields({ ...mentor, description: 'Short' }, null, model)).toEqual({ levelEstimate: null, modelVersion: LEVEL_MODEL_VERSION })
  })
})

describe('tagging with the level model', () => {
  const base = {
    title: 'Backend Developer', description: '', company: 'Acme', source: 'greenhouse:acme', location: '', tags: [],
    board: { type: null, employment: null, workMode: null }, experience: null, experienceYears: null, stipend: null,
  }

  it('adds the estimate fields beside the plain level, which stays unknown', () => {
    const got = tagsFor(base)
    expect(got).toMatchObject({ level: null, levelTag: null, levelEstimate: null, modelVersion: LEVEL_MODEL_VERSION })
    expect(tagsFor({ ...base, title: 'Senior Backend Developer' })).toMatchObject({ level: 'senior', levelEstimate: null })
  })

  it('estimates again when only the level model is newer, leaving the rules’ tags alone', () => {
    const stored = tagRow({ id: 'p', source: 'greenhouse:acme', title: 'Backend Developer', company: 'Acme', descriptionText: 'Build APIs.' })
    const older = { ...stored, modelVersion: LEVEL_MODEL_VERSION - 1, levelEstimate: { range: ['mid', 'senior'] } }
    const again = retagged(older)
    expect(again).toMatchObject({ modelVersion: LEVEL_MODEL_VERSION, levelEstimate: null, tagsVersion: TAGS_VERSION })
    expect(again.levelTag).toBe(stored.levelTag)
    expect(again.typeTag).toBe(stored.typeTag)
    expect(retagged(again)).toBe(again)
  })
})
