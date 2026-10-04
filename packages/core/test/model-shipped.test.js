import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { shippedModel } from '@jobdekho/core/model/weights.js'
import { MODEL_VERSIONS } from '@jobdekho/core/model/version.js'
import { estimateLevel } from '@jobdekho/core/model/level-estimate.js'
import { estimateSections } from '@jobdekho/core/model/section-estimate.js'
import { modelSections, sortedSections } from '@jobdekho/core/model/model-sections.js'
import { auditPassed, shippedAudits } from '@jobdekho/core/model/audit.js'

// The one place the real weights are used: what ships loads and answers,
// at the versions the code and the model card record, and what does not
// ship is simply absent. Nothing here depends on what the weights say.
const weightsFile = (name) => new URL(`../src/model/weights/${name}.json`, import.meta.url)
const card = readFileSync(new URL('../../../docs/model-card.md', import.meta.url), 'utf8')
const cardVersion = (heading) => Number(new RegExp(`## ${heading}[\\s\\S]*?- Version: (\\d+)`).exec(card)?.[1])

const TEXT = [
  'Our team builds payment software used across India.',
  '- Design and build REST APIs in Go and Kafka',
  '- Write unit tests and review code from your peers',
  '- Bachelor’s degree in computer science or a related field',
  'We offer health insurance and a yearly learning budget.',
].join('\n')

describe('the shipped section model', () => {
  it('loads at the version the code expects and the model card records', () => {
    const sections = shippedModel('sections')
    expect(sections).toMatchObject({ name: 'sections', version: MODEL_VERSIONS.sections, classes: ['duties', 'requirements', 'pay', 'about', 'other'] })
    expect(cardVersion('Section model')).toBe(MODEL_VERSIONS.sections)
    expect(statSync(weightsFile('sections')).size).toBeLessThan(4 * 1024 * 1024)
  })

  it('sorts every line of a description into a known section', () => {
    const kinds = estimateSections(TEXT.split('\n'))
    expect(kinds).toHaveLength(5)
    for (const kind of kinds) expect(['duties', 'requirements', 'pay', 'about', 'other']).toContain(kind)
  })

  it('shows its sorting in the app only once the shipped audit of its version passed', () => {
    const model = shippedModel('sections')
    const expected = auditPassed(shippedAudits(), model) ? sortedSections(TEXT, { model }) : null
    expect(modelSections(TEXT)).toEqual(expected)
  })
})

describe('the level model', () => {
  // No unknown posting reached its bar (docs/model-card.md), so its weights
  // stay out of the package and nothing estimates a level.
  it('is not shipped, and estimates nothing', () => {
    expect(existsSync(weightsFile('level'))).toBe(false)
    expect(shippedModel('level')).toBeNull()
    expect(estimateLevel({ title: 'Data Analyst', company: 'Acme', description: TEXT })).toBeNull()
    expect(cardVersion('Level range model')).toBe(MODEL_VERSIONS.level)
    expect(card).toMatch(/## Level range model\n\n- Status: not shipped: no unknown posting reaches the bar/)
  })
})
