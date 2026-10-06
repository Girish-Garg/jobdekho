import { describe, it, expect } from 'vitest'
import { decodeModel } from '@jobdekho/core/model/weights.js'
import { FACT_KINDS, factExamples, fingerprint, isCandidate, readLabels, readWritten, unreviewedShown } from '../fact-data.js'

const posting = (id, company, description) => ({ id, company, companyKey: company.toLowerCase(), source: 'lever', description })

describe('the lines the facts model learns from', () => {
  // A label is kept under the line's fingerprint, never its text, and the
  // fingerprint must not move with spacing or case.
  it('fingerprints a line the same however it is spaced or cased', () => {
    expect(fingerprint('Night  shift\tonly')).toBe(fingerprint('night shift only'))
    expect(fingerprint('Night shift only')).toMatch(/^[0-9a-f]{16}$/)
  })

  it('picks out the lines a fact is stated with as candidates', () => {
    expect(isCandidate('Opportunity for full-time conversion after the internship')).toBe(true)
    expect(isCandidate('Shift Timings: 2 PM to 11 PM IST')).toBe(true)
    expect(isCandidate('Build REST APIs in Go.')).toBe(false)
  })

  it('takes labelled candidates, plain lines as none, and the written examples apart', () => {
    const ppo = 'Paid internship with potential for full-time employment.'
    const labels = { [fingerprint(ppo)]: 'ppo' }
    const postings = [posting('p1', 'Acme', `${ppo}\nBuild REST APIs in Go.\nNight shifts (7pm - 4am)`), posting('p2', 'Zeta', ppo)]
    const { examples, unlabelled } = factExamples(postings, { labels, written: [['Immediate joiners only', 'start']] })
    const kinds = examples.map((e) => [e.text, FACT_KINDS[e.y], Boolean(e.written)])
    expect(kinds).toEqual([[ppo, 'ppo', false], ['Build REST APIs in Go.', 'none', false], ['Immediate joiners only', 'start', true]])
    expect(unlabelled).toEqual([{ line: 'Night shifts (7pm - 4am)', company: 'Acme', source: 'lever' }])
  })

  it('lists what a model would show that no one has read, and only that', () => {
    const tiny = decodeModel({
      name: 'facts', version: 1, classes: FACT_KINDS, thresholds: { shift: 0.5 }, scale: 1,
      bias: [0, 0, 0, 0, 2], features: ['w:shifts'], weights: [0, 12, 0, 0, 0],
    })
    const read = 'Willing to work in shifts as needed.'
    const unread = 'Must be willing to work in shifts based on business needs'
    const postings = [posting('p1', 'Acme', `${read}\n${unread}`)]
    expect(unreviewedShown(postings, tiny, { labels: { [fingerprint(read)]: 'shift' } })).toEqual([
      { line: unread, kind: 'shift', value: 'Shift work', confidence: expect.any(Number), company: 'Acme' },
    ])
  })

  // The labels file holds fingerprints only, and the written examples are
  // sentences written for it: neither carries posting text.
  it('keeps labels as fingerprints and written examples as plain pairs', () => {
    const labels = readLabels()
    expect(Object.keys(labels).every((key) => /^[0-9a-f]{16}$/.test(key))).toBe(true)
    expect(new Set(Object.values(labels))).toEqual(new Set(['ppo', 'shift', 'start', 'email', 'openings', 'none']))
    expect(readWritten().every(([text, label]) => typeof text === 'string' && FACT_KINDS.includes(label))).toBe(true)
  })
})
