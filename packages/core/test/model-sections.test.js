import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { decodeModel } from '@jobdekho/core/model/weights.js'
import { estimateSections, scoreLines } from '@jobdekho/core/model/section-estimate.js'
import { modelSections, sortableLines } from '@jobdekho/core/model/model-sections.js'

// A hand-made model (fixtures/model-sections.json): "build" means duties,
// "degree" and "knowledge" requirements, "insurance" pay, and "founded"
// about, which has no threshold and so is never shown.
const model = decodeModel(JSON.parse(readFileSync(new URL('./fixtures/model-sections.json', import.meta.url), 'utf8')))

const AD = [
  'We are hiring a backend engineer to join us.',
  '- Build APIs in Go',
  '- Build data pipelines',
  '- Degree in computer science',
  '- Knowledge of Kafka is a plus',
  '- Health insurance for your family',
  'Acme was founded in 2010.',
  'We are an equal opportunity employer and hire without regard to race.',
].join('\n')

describe('estimateSections', () => {
  it('places a line only when its section clears the threshold', () => {
    const lines = ['- Build APIs in Go', 'Join a friendly team', 'Acme was founded in 2010', '- Health insurance']
    expect(estimateSections(lines, model)).toEqual(['duties', 'other', 'other', 'pay'])
    expect(scoreLines(lines, model)[2]).toMatchObject({ kind: 'about', shown: 'other', words: ['founded'] })
  })

  it('leaves every line other without a model', () => {
    expect(estimateSections(['- Build APIs'], null)).toEqual(['other'])
  })
})

describe('sortableLines', () => {
  it('cuts a flattened body into lines and leaves its headings out', () => {
    expect(sortableLines('Key Responsibilities • Build APIs • Write tests. Requirements: • Go')).toEqual(['- Build APIs', '- Write tests.', '- Go'])
  })
})

describe('modelSections', () => {
  it('lays the sorted lines out in reading order after the opening summary', () => {
    const got = modelSections(AD, { model })
    expect(got.map((s) => [s.kind, s.lines, s.boilerplate])).toEqual([
      ['other', ['We are hiring a backend engineer to join us.'], false],
      ['duties', ['- Build APIs in Go', '- Build data pipelines'], false],
      ['requirements', ['- Degree in computer science'], false],
      ['nice', ['- Knowledge of Kafka is a plus'], false],
      ['pay', ['- Health insurance for your family'], false],
      ['other', ['Acme was founded in 2010.'], false],
      ['other', ['We are an equal opportunity employer and hire without regard to race.'], true],
    ])
    for (const section of got) expect(section).toMatchObject({ heading: null, from: 'model', version: 9 })
  })

  it('folds company template text the way headed sections do', () => {
    const got = modelSections(AD, { model, isTemplate: (line) => line.startsWith('- Health') })
    expect(got.find((s) => s.kind === 'pay')).toMatchObject({ boilerplate: true })
  })

  it('keeps the plain layout when the model places too little', () => {
    expect(modelSections('Join us.\nWe are friendly.\n- Build APIs', { model })).toBeNull()
    expect(modelSections('- Build APIs\n- Build tools', { model })).toBeNull()
    expect(modelSections(AD, { model: null })).toBeNull()
  })
})
