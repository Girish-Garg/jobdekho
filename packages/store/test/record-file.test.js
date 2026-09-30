import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { recordFile } from '@jobdekho/store/record-file.js'
import { openStore, FILES } from '@jobdekho/store/open.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-record-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

const GUARD = { lastSweepAt: '2026-09-30T08:00:00.000Z', pausedUntil: null, refusals: 0 }

describe('recordFile', () => {
  it('is null until written, then holds one record, readable by hand', () => {
    const file = recordFile(join(dir, 'x.json'))
    expect(file.get()).toBeNull()
    file.set(GUARD)
    expect(file.get()).toEqual(GUARD)
    expect(readFileSync(join(dir, 'x.json'), 'utf8')).toBe(`${JSON.stringify(GUARD, null, 2)}\n`)
  })

  it('sees what another handle wrote, as the CLI and the server share it', () => {
    const server = recordFile(join(dir, 'x.json'))
    expect(server.get()).toBeNull()
    recordFile(join(dir, 'x.json')).set(GUARD)
    expect(server.get()).toEqual(GUARD)
  })

  it('reads a file broken by hand as none, and the next write mends it', () => {
    writeFileSync(join(dir, 'x.json'), '{broken')
    const file = recordFile(join(dir, 'x.json'))
    expect(file.get()).toBeNull()
    file.set(GUARD)
    expect(JSON.parse(readFileSync(join(dir, 'x.json'), 'utf8'))).toEqual(GUARD)
  })
})

describe('the LinkedIn guard in the store', () => {
  it('is its own file in the data folder, not written until a sweep is', () => {
    const store = openStore(dir)
    expect(store.linkedinGuard.get()).toBeNull()
    expect(existsSync(join(dir, FILES.linkedinGuard))).toBe(false)
    store.linkedinGuard.set(GUARD)
    expect(FILES.linkedinGuard).toBe('linkedin-guard.json')
    expect(openStore(dir).linkedinGuard.get()).toEqual(GUARD)
  })
})
