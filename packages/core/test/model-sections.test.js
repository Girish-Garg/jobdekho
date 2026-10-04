import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { decodeModel } from '@jobdekho/core/model/weights.js'
import { estimateSections, scoreLines } from '@jobdekho/core/model/section-estimate.js'
import { modelSections, sortedSections, sortableLines, placedKinds } from '@jobdekho/core/model/model-sections.js'
import { sortableUnits } from '@jobdekho/core/model/section-lines.js'

// A hand-made model (fixtures/model-sections.json, version 9): "build" means
// duties, "degree" and "knowledge" requirements, "insurance" pay, and
// "founded" about, which has no threshold and so is never shown.
const model = decodeModel(JSON.parse(readFileSync(new URL('./fixtures/model-sections.json', import.meta.url), 'utf8')))
const passed = { sections: { version: 9, passed: true, samples: 236, errors: 1, lowerBound: 0.9801, reviewedAt: '2026-10-06' } }

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

describe('placedKinds', () => {
  // The first version's pre-check: requirement lines under a nice-to-have
  // heading the rules did not know were shown as requirements.
  it('reads the headings over its lines, known to the rules or not', () => {
    const text = [
      'We are hiring a backend engineer to join us.',
      'You will be successful in this role if you have:',
      '- Knowledge of Kafka',
      'Things that would make you stand out:',
      '- Knowledge of Rust',
      '- Build a compiler',
      'Nice to have:',
      '- Degree in physics',
    ].join('\n')
    const { lines, under } = sortableUnits(text)
    const kinds = placedKinds(lines, model, under)
    expect(lines.map((line, i) => [line, kinds[i]])).toEqual([
      ['We are hiring a backend engineer to join us.', 'other'],
      ['You will be successful in this role if you have:', 'other'],
      ['- Knowledge of Kafka', 'requirements'],
      ['Things that would make you stand out:', 'other'],
      ['- Knowledge of Rust', 'nice'],
      ['- Build a compiler', 'other'],
      ['- Degree in physics', 'nice'],
    ])
  })

  it('makes a requirement nice only when a cue governs all of it', () => {
    const lines = ['- Degree in physics (Master’s degree preferred)', '- Knowledge of Kafka is a plus', '- Knowledge of Go, preferably Kafka Streams']
    expect(placedKinds(lines, model)).toEqual(['requirements', 'nice', 'requirements'])
  })

  it('never places notices, headings or a piece broken off a sentence', () => {
    const lines = [
      'Acme is hiring a seasoned engineer for its Cloud Development',
      '- Knowledge team.',
      'Knowledge Base',
      'Acme does not charge candidates any recruitment fees for a degree.',
      'Acme is an equal opportunity employer that values every degree.',
      '- Knowledge of Kafka and Kafka Streams',
    ]
    expect(placedKinds(lines, model)).toEqual(['other', 'other', 'other', 'other', 'other', 'requirements'])
  })
})

describe('sortedSections', () => {
  // The pane names every section after the first by its kind and reads the
  // first as the opening, so the unsorted lines must open the posting.
  it('opens with the lines it left unsorted, then the sorted ones in reading order', () => {
    const got = sortedSections(AD, { model })
    expect(got.map((s) => [s.kind, s.lines, s.boilerplate])).toEqual([
      ['other', ['We are hiring a backend engineer to join us.', 'Acme was founded in 2010.'], false],
      ['duties', ['- Build APIs in Go', '- Build data pipelines'], false],
      ['requirements', ['- Degree in computer science'], false],
      ['nice', ['- Knowledge of Kafka is a plus'], false],
      ['pay', ['- Health insurance for your family'], false],
      ['other', ['We are an equal opportunity employer and hire without regard to race.'], true],
    ])
    for (const section of got) expect(section).toMatchObject({ heading: null, from: 'model', version: 9 })
  })

  it('folds company template text the way headed sections do', () => {
    const got = sortedSections(AD, { model, isTemplate: (line) => /^- Health|founded/.test(line) })
    expect(got.find((s) => s.kind === 'pay')).toMatchObject({ boilerplate: true })
    expect(got[0].lines).toEqual(['We are hiring a backend engineer to join us.'])
    expect(got.filter((s) => s.kind === 'other' && s.boilerplate).flatMap((s) => s.lines))
      .toEqual(['Acme was founded in 2010.', 'We are an equal opportunity employer and hire without regard to race.'])
  })

  it('keeps the plain layout when the model places too little, or everything', () => {
    expect(sortedSections('Join us.\nWe are friendly.\n- Build APIs', { model })).toBeNull()
    expect(sortedSections('- Build APIs\n- Build tools\n- Degree in maths', { model })).toBeNull()
    expect(sortedSections(AD, { model: null })).toBeNull()
  })
})

describe('modelSections', () => {
  it('shows the sorting once the owner’s audit of this very version passed', () => {
    expect(modelSections(AD, { model, audits: passed })).toEqual(sortedSections(AD, { model }))
  })

  it('stays off without an audit, after a failed one, or for an older version', () => {
    expect(modelSections(AD, { model, audits: {} })).toBeNull()
    expect(modelSections(AD, { model, audits: { sections: { ...passed.sections, passed: false, lowerBound: 0.97 } } })).toBeNull()
    expect(modelSections(AD, { model, audits: { sections: { ...passed.sections, version: 8 } } })).toBeNull()
    expect(modelSections(AD, { model, audits: { sections: { ...passed.sections, lowerBound: 0.979 } } })).toBeNull()
    expect(modelSections(AD, { model: null, audits: passed })).toBeNull()
  })
})
