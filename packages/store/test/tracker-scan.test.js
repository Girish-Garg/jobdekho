import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openStore } from '@jobdekho/store/open.js'
import { addTrackerEntry, listTracker } from '@jobdekho/store/tracker.js'
import { applyMailScan, undoMailScan } from '@jobdekho/store/tracker-scan.js'
import { lastScanOf } from '@jobdekho/store/tracker-file.js'

let dir
let store
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'jobdekho-tracker-scan-'))
  store = openStore(dir)
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))

const mail = (id, kind, date) => ({ id, kind, date, from: 'Lever mail', text: kind })
const group = (mails, extra = {}) => ({ company: 'Initech', role: 'SDE intern', contact: null, mails, ...extra })

describe('a mail scan into the Tracker', () => {
  it('moves a stage forward only, and a rejection closes from any stage', () => {
    addTrackerEntry(store, 'u1', { company: 'Initech', role: 'SDE intern', stage: 'interview' }, new Date('2026-09-10T00:00:00Z'))
    applyMailScan(store, 'u1', [group([mail('m1', 'applied', '2026-09-01T00:00:00Z')])])
    expect(listTracker(store, 'u1')[0].stage).toBe('interview')
    applyMailScan(store, 'u1', [group([mail('m2', 'rejected', '2026-09-30T00:00:00Z')])])
    expect(listTracker(store, 'u1')[0]).toMatchObject({ stage: 'closed', stageAt: '2026-09-30T00:00:00.000Z' })
  })

  it('keeps the last Undo when a scan changes nothing, and undoes only what it changed', () => {
    applyMailScan(store, 'u1', [group([mail('m1', 'applied', '2026-09-01T00:00:00Z')])])
    const first = lastScanOf(store, 'u1')
    expect(applyMailScan(store, 'u1', [group([mail('m1', 'applied', '2026-09-01T00:00:00Z')])])).toEqual({ added: 0, updated: 0 })
    expect(lastScanOf(store, 'u1')).toEqual(first)
    addTrackerEntry(store, 'u1', { company: 'Globex' })
    expect(undoMailScan(store, 'u1')).toMatchObject({ undone: true, removed: 1 })
    expect(listTracker(store, 'u1').map((e) => e.company)).toEqual(['Globex'])
    expect(undoMailScan(store, 'u1')).toEqual({ undone: false })
  })
})
