import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { appendFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { decodeModel } from '@jobdekho/core/model/weights.js'
import { FACT_KINDS, factExamples, fingerprint, isCandidate, readLabels, readWritten, unreviewedShown } from '../fact-data.js'
import { keepLines, readArchive } from '../fact-archive.js'

const posting = (id, company, description) => ({ id, company, companyKey: company.toLowerCase(), source: 'lever', description })

// "shifts" pushes a line to the shifts; anything else stays none.
const tiny = decodeModel({
  name: 'facts', version: 1, classes: FACT_KINDS, thresholds: { shift: 0.5 }, scale: 1,
  bias: [0, 0, 0, 0, 2], features: ['w:shifts'], weights: [0, 12, 0, 0, 0],
})

let dir
let file
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jobdekho-facts-'))
  file = join(dir, 'lines.ndjson')
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

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

  it('takes the archive\'s labelled lines, plain lines as none, and the written examples apart', () => {
    const ppo = 'Paid internship with potential for full-time employment.'
    const labels = { [fingerprint(ppo)]: 'ppo' }
    const postings = [posting('p1', 'Acme', `${ppo}\nBuild REST APIs in Go.\nNight shifts (7pm - 4am)`), posting('p2', 'Zeta', ppo)]
    keepLines(postings, { labels, file })
    const { examples, unlabelled, gone } = factExamples(postings, { labels, written: [['Immediate joiners only', 'start']], archive: readArchive(file) })
    expect(examples.map((e) => [e.text, FACT_KINDS[e.y], Boolean(e.written)])).toEqual([
      [ppo, 'ppo', false], ['Build REST APIs in Go.', 'none', false], ['Immediate joiners only', 'start', true],
    ])
    expect(unlabelled).toEqual([{ line: 'Night shifts (7pm - 4am)', company: 'Acme', source: 'lever' }])
    expect(gone).toBe(0)
  })

  it('lists what a model would show that no one has read, and only that', () => {
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

// The app deletes a posting once it closes; a label must not lose its line.
describe('the archive of labelled lines', () => {
  it('keeps candidates, labelled lines and lines a model shows, each once, and adds only what is new', () => {
    // A model that takes "weekends" for shifts, so it shows a line no
    // candidate word picks out.
    const weekends = decodeModel({
      name: 'facts', version: 1, classes: FACT_KINDS, thresholds: { shift: 0.5 }, scale: 1,
      bias: [0, 0, 0, 0, 2], features: ['w:weekends'], weights: [0, 12, 0, 0, 0],
    })
    const labelled = 'Permanent'
    const postings = [posting('p1', 'Acme', `Shift Timings: 2 PM to 11 PM IST\n${labelled}\nBuild REST APIs in Go.\nSome work on weekends`)]
    const now = new Date('2026-10-07T10:00:00Z')
    expect(keepLines(postings, { labels: { [fingerprint(labelled)]: 'none' }, model: weekends, file, now })).toEqual({ added: 3, total: 3 })
    expect([...readArchive(file).values()].map((e) => [e.text, e.seen])).toEqual([
      ['Shift Timings: 2 PM to 11 PM IST', '2026-10-07'], ['Permanent', '2026-10-07'], ['Some work on weekends', '2026-10-07'],
    ])
    const before = readFileSync(file, 'utf8')
    expect(keepLines(postings, { model: weekends, file, now })).toEqual({ added: 0, total: 3 })
    expect(readFileSync(file, 'utf8')).toBe(before)
  })

  it('still trains on a labelled line whose posting the app has deleted', () => {
    const ppo = 'Opportunity for full-time conversion after the internship'
    const labels = { [fingerprint(ppo)]: 'ppo' }
    keepLines([posting('p1', 'Acme', ppo)], { labels, file })
    const { examples, gone } = factExamples([posting('p2', 'Zeta', 'Build REST APIs in Go.')], { labels, written: [], archive: readArchive(file) })
    expect(examples.map((e) => [e.text, FACT_KINDS[e.y]])).toEqual([[ppo, 'ppo'], ['Build REST APIs in Go.', 'none']])
    expect(gone).toBe(1)
  })

  it('skips a last line cut short by a write that did not finish', () => {
    keepLines([posting('p1', 'Acme', 'Night shifts (7pm - 4am)')], { file })
    appendFileSync(file, '{"fp":"abc","text":"Night')
    expect([...readArchive(file).values()].map((e) => e.text)).toEqual(['Night shifts (7pm - 4am)'])
  })
})
