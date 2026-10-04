import { describe, it, expect } from 'vitest'
import { readFileSync, statSync } from 'node:fs'
import { shippedModel } from '@jobdekho/core/model/weights.js'
import { MODEL_VERSIONS } from '@jobdekho/core/model/version.js'
import { estimateLevel } from '@jobdekho/core/model/level-estimate.js'
import { estimateSections } from '@jobdekho/core/model/section-estimate.js'
import { LEVELS } from '@jobdekho/core/level.js'

// The one place the real weights are used: they load, they answer, and
// their versions are the code's and the model card's. Nothing here depends
// on what the weights happen to say.
const weightsFile = (name) => new URL(`../src/model/weights/${name}.json`, import.meta.url)
const card = readFileSync(new URL('../../../docs/model-card.md', import.meta.url), 'utf8')
const cardVersion = (heading) => Number(new RegExp(`## ${heading}[\\s\\S]*?- Version: (\\d+)`).exec(card)?.[1])

describe('the shipped models', () => {
  it('load at the versions the code expects and the model card records', () => {
    const level = shippedModel('level')
    const sections = shippedModel('sections')
    expect(level).toMatchObject({ name: 'level', version: MODEL_VERSIONS.level, classes: LEVELS })
    expect(sections).toMatchObject({ name: 'sections', version: MODEL_VERSIONS.sections, classes: ['duties', 'requirements', 'pay', 'about', 'other'] })
    expect(cardVersion('Level range model')).toBe(MODEL_VERSIONS.level)
    expect(cardVersion('Section model')).toBe(MODEL_VERSIONS.sections)
  })

  it('estimate a level range or abstain, never an exact level', () => {
    const posting = {
      title: 'Data Analyst', company: 'Acme',
      description: 'We pay a monthly stipend to students in their final year. You will clean data, build dashboards and present findings to the team every week. You will learn SQL, Python and Excel from mentors who care about your growth. Selected candidates work from our Pune office.',
    }
    const estimate = estimateLevel(posting)
    if (estimate) {
      expect(estimate.range).toHaveLength(2)
      expect(LEVELS.indexOf(estimate.range[1]) - LEVELS.indexOf(estimate.range[0])).toBe(1)
      expect(estimate.version).toBe(MODEL_VERSIONS.level)
      expect(estimate.evidence).toMatch(/^Estimated from/)
    } else {
      expect(estimate).toBeNull()
    }
  })

  it('sort every line of a description into a known section', () => {
    const lines = ['- Design and build REST APIs in Go', '- Bachelor’s degree in computer science', 'We offer health insurance.']
    const kinds = estimateSections(lines)
    expect(kinds).toHaveLength(3)
    for (const kind of kinds) expect(['duties', 'requirements', 'pay', 'about', 'other']).toContain(kind)
  })

  it('stay small enough to ship', () => {
    const bytes = statSync(weightsFile('level')).size + statSync(weightsFile('sections')).size
    expect(bytes).toBeLessThan(4 * 1024 * 1024)
  })
})
