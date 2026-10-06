import { describe, it, expect } from 'vitest'
import { decodeModel, shippedModel } from '@jobdekho/core/model/weights.js'
import { factFeatures } from '@jobdekho/core/model/fact-features.js'
import { modelFacts, withModelFacts } from '@jobdekho/core/model/model-facts.js'
import { descriptionFacts, linesOf } from '@jobdekho/core/description-facts.js'
import { MODEL_VERSIONS } from '@jobdekho/core/model/version.js'

// A model small enough to read: "potential" and "conversion" push a line
// to a PPO, "shifts" to the shifts, anything else stays none. What the
// shipped weights pick is theirs to say; the gate and the merge are what
// the app codes against.
const CLASSES = ['ppo', 'shift', 'start', 'email', 'none']
const tiny = decodeModel({
  name: 'facts', version: MODEL_VERSIONS.facts, classes: CLASSES, temperature: 1, thresholds: { ppo: 0.5, shift: 0.5 }, scale: 1,
  bias: [0, 0, 0, 0, 2], features: ['w:potential', 'w:conversion', 'w:shifts'],
  weights: [12, 0, 0, 0, 0, 12, 0, 0, 0, 0, 0, 12, 0, 0, 0],
})
const passed = { facts: { version: MODEL_VERSIONS.facts, passed: true, samples: 237, errors: 0, lowerBound: 0.9874 } }
const text = 'About the internship\nPaid internship with potential for full-time employment.\nWilling to work in shifts based on business needs.'

describe('the facts model in the list', () => {
  it('adds nothing until the owner\'s audit of its very version has passed', () => {
    expect(withModelFacts({ ppo: null }, linesOf(text), { model: tiny, audits: {} })).toEqual({ ppo: null })
    const old = { facts: { ...passed.facts, version: MODEL_VERSIONS.facts - 1 } }
    expect(descriptionFacts(text, { model: tiny, audits: old }).ppo).toBeNull()
  })

  it('adds what the plain readers missed, saying it was the model, once the audit passed', () => {
    const facts = descriptionFacts(text, { model: tiny, audits: passed })
    expect(facts.ppo).toEqual({ value: 'PPO possible', from: 'model', evidence: 'Says "Paid internship with potential for full-time employment." (read by JobDekho\'s model)' })
    expect(facts.shift).toMatchObject({ value: 'Shift work', from: 'model' })
  })

  // Words that state a fact in so many words are the better evidence.
  it('never replaces what the plain readers found', () => {
    const both = `${text}\nNight shifts (7pm - 4am)`
    expect(descriptionFacts(both, { model: tiny, audits: passed }).shift).toEqual({ value: 'Night shift, 7 PM to 4 AM', evidence: 'Says "Night shifts (7pm - 4am)"' })
  })

  it('passes over a line it picked that states nothing usable, for the next one', () => {
    const lines = ['Shift timings', 'Must be willing to work in shifts based on business needs']
    expect(modelFacts(lines, tiny).shift).toMatchObject({ value: 'Shift work', line: lines[1] })
  })

  it('ships weights of the version the code expects', () => {
    const model = shippedModel('facts')
    expect(model).toMatchObject({ name: 'facts', version: MODEL_VERSIONS.facts, classes: CLASSES })
    expect(model.thresholds.ppo).toBeGreaterThan(0)
  })
})

describe('what the facts model reads of a line', () => {
  // The weights must hold no one's address or name.
  it('reads an address as the kind of address it is, never the address', () => {
    const words = [...factFeatures('Send your CV to priya.sharma@gmail.com or careers@acme.com').keys()]
    expect(words).toContain('w:zzpersonal')
    expect(words).toContain('w:zzapplydesk')
    expect(words.some((w) => /priya|sharma|acme|gmail/.test(w))).toBe(false)
    expect([...factFeatures('Shift: 2 pm - 11 pm, 24x7 support').keys()]).toEqual(expect.arrayContaining(['w:zztime', 'w:zz247']))
  })
})
