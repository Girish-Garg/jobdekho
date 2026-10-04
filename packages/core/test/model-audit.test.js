import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { readAudits, auditPassed, BAR } from '@jobdekho/core/model/audit.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-audit-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const record = { version: 1, passed: true, samples: 150, errors: 0, lowerBound: 0.9802, reviewedAt: '2026-10-06' }

describe('the shipped audit records', () => {
  it('read as none when the file is missing or unreadable', () => {
    expect(readAudits(pathToFileURL(join(dir, 'audit.json')))).toEqual({})
    writeFileSync(join(dir, 'torn.json'), '{"sections": {')
    expect(readAudits(pathToFileURL(join(dir, 'torn.json')))).toEqual({})
  })

  it('read every model’s record from the file', () => {
    writeFileSync(join(dir, 'audit.json'), JSON.stringify({ sections: record }))
    expect(readAudits(pathToFileURL(join(dir, 'audit.json')))).toEqual({ sections: record })
  })
})

describe('auditPassed', () => {
  const model = { name: 'sections', version: 1 }

  it('lets a model show only after a passing review of its very version', () => {
    expect(auditPassed({ sections: record }, model)).toBe(true)
    expect(auditPassed({}, model)).toBe(false)
    expect(auditPassed({ sections: { ...record, passed: false } }, model)).toBe(false)
    expect(auditPassed({ sections: { ...record, version: 0 } }, model)).toBe(false)
    expect(auditPassed({ sections: record }, { ...model, version: 2 })).toBe(false)
    expect(auditPassed({ level: record }, model)).toBe(false)
    expect(auditPassed({ sections: record }, null)).toBe(false)
  })

  // The bound is the rule; a hand-edited "passed" without it does not count.
  it('holds the record to the 98% bound itself', () => {
    expect(BAR).toBe(0.98)
    expect(auditPassed({ sections: { ...record, lowerBound: 0.9799 } }, model)).toBe(false)
    expect(auditPassed({ sections: { version: 1, passed: true } }, model)).toBe(false)
  })
})
