import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { lowerBound, upperTail, auditResult } from '../review/stats.js'
import { allocate, drawSample } from '../review/samples.js'
import { progress, auditRecord, finish, savedAudit } from '../review/result.js'
import { auditPassed } from '@jobdekho/core/model/audit.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-review-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('a finished review', () => {
  const at = new Date('2026-10-06T10:00:00Z')

  it('leaves the record core reads, with its bound rounded down', () => {
    const record = auditRecord(1, [...Array(235).fill('right'), 'wrong'], at)
    expect(record).toEqual({ version: 1, passed: true, samples: 236, errors: 1, lowerBound: 0.98, reviewedAt: '2026-10-06' })
    expect(auditPassed({ sections: record }, { name: 'sections', version: 1 })).toBe(true)
    const failed = auditRecord(1, [...Array(148).fill('right'), 'wrong', 'wrong'], at)
    expect(failed).toMatchObject({ passed: false, samples: 150, errors: 2 })
    expect(auditPassed({ sections: failed }, { name: 'sections', version: 1 })).toBe(false)
  })

  it('writes its record beside the other models’ and reads it back for its version only', () => {
    const file = pathToFileURL(join(dir, 'audit.json'))
    writeFileSync(file, JSON.stringify({ level: { version: 1, passed: false } }))
    const samples = [{ id: 'a' }, { id: 'b' }]
    const record = finish('sections', 3, samples, { a: { verdict: 'right' }, b: { verdict: 'right' } }, { file, card: false })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ level: { version: 1, passed: false }, sections: record })
    expect(record).toMatchObject({ version: 3, passed: false, samples: 2, errors: 0 })
    expect(savedAudit('sections', 3, file)).toEqual(record)
    expect(savedAudit('sections', 4, file)).toBeNull()
  })
})

describe('the Clopper-Pearson lower bound', () => {
  // The audit sizes the owner's claim rests on: 98% with 95% confidence.
  it('passes 0 wrong in 150, or 1 wrong in 236, and nothing less', () => {
    expect(lowerBound(150, 150)).toBeGreaterThanOrEqual(0.98)
    expect(lowerBound(148, 148)).toBeLessThan(0.98)
    expect(lowerBound(236, 235)).toBeGreaterThanOrEqual(0.98)
    expect(lowerBound(235, 234)).toBeLessThan(0.98)
    expect(lowerBound(150, 150)).toBeCloseTo(Math.pow(0.05, 1 / 150), 6)
  })

  it('is the precision at which the observed result is just possible', () => {
    const p = lowerBound(200, 190)
    expect(upperTail(200, 190, p)).toBeCloseTo(0.05, 3)
    expect(lowerBound(0, 0)).toBe(0)
  })

  it('reads a finished review', () => {
    const result = auditResult([...Array(149).fill('right'), 'wrong'])
    expect(result).toMatchObject({ checked: 150, right: 149, wrong: 1, passed: false })
    expect(auditResult(Array(150).fill('right')).passed).toBe(true)
  })
})

describe('drawing a sample', () => {
  const outputs = []
  for (let i = 0; i < 300; i++) outputs.push({ id: `o${i}`, group: i < 240 ? 'duties' : 'pay', companyKey: `c${i % 40}` })

  it('gives each group its share of the sample', () => {
    expect(allocate({ duties: 240, pay: 60 }, 250)).toEqual({ duties: 200, pay: 50 })
    expect(allocate({ duties: 3, pay: 1 }, 250)).toEqual({ duties: 3, pay: 1 })
  })

  it('draws the same sample every time, spread across companies', () => {
    const sample = drawSample(outputs, { size: 50 })
    expect(sample.map((s) => s.id)).toEqual(drawSample(outputs, { size: 50 }).map((s) => s.id))
    expect(sample).toHaveLength(50)
    expect(new Set(sample.map((s) => s.id)).size).toBe(50)
    const perCompany = {}
    for (const s of sample) perCompany[s.companyKey] = (perCompany[s.companyKey] ?? 0) + 1
    expect(Math.max(...Object.values(perCompany))).toBeLessThanOrEqual(2)
  })

  it('takes every output when there are fewer than the sample size', () => {
    expect(drawSample(outputs.slice(0, 7))).toHaveLength(7)
    expect(drawSample([])).toEqual([])
  })
})

describe('progress', () => {
  it('resumes at the first sample not yet checked', () => {
    const samples = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(progress(samples, { a: { verdict: 'right' }, c: { verdict: 'wrong' } })).toEqual({ total: 3, checked: 2, right: 1, wrong: 1, resumeAt: 1, done: false })
    expect(progress(samples, { a: { verdict: 'right' }, b: { verdict: 'right' }, c: { verdict: 'right' } }).done).toBe(true)
  })
})
