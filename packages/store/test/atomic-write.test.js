import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, readdirSync, existsSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { writeAtomic, tempPathFor, TEMP_SUFFIX } from '@jobdekho/store/atomic-write.js'

// Only the rename is wrapped, so a test can make the last step fail the way
// a process dying between the flush and the swap would.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, renameSync: vi.fn(actual.renameSync) }
})

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

describe('writeAtomic', () => {
  it('writes the content and leaves no temp file behind', () => {
    const path = join(dir, 'a.json')
    writeAtomic(path, '{"n":1}')
    expect(readFileSync(path, 'utf8')).toBe('{"n":1}')
    expect(readdirSync(dir)).toEqual(['a.json'])
  })

  it('creates missing parent directories', () => {
    const path = join(dir, 'nested', 'deeper', 'a.txt')
    writeAtomic(path, 'x')
    expect(readFileSync(path, 'utf8')).toBe('x')
  })

  it('a crash before the rename leaves the previous file whole and no temp file', () => {
    const path = join(dir, 'corpus.ndjson')
    writeAtomic(path, 'first, intact\n')
    renameSync.mockImplementationOnce(() => { throw new Error('simulated crash before rename') })
    expect(() => writeAtomic(path, 'second, never landed\n')).toThrow('simulated crash')
    expect(readFileSync(path, 'utf8')).toBe('first, intact\n')
    expect(readdirSync(dir)).toEqual(['corpus.ndjson'])
  })

  it('a write that succeeds after a failed one replaces the file cleanly', () => {
    const path = join(dir, 'corpus.ndjson')
    writeAtomic(path, 'first\n')
    renameSync.mockImplementationOnce(() => { throw new Error('simulated crash') })
    expect(() => writeAtomic(path, 'lost\n')).toThrow()
    writeAtomic(path, 'third\n')
    expect(readFileSync(path, 'utf8')).toBe('third\n')
    expect(readdirSync(dir)).toEqual(['corpus.ndjson'])
  })
})

describe('tempPathFor', () => {
  it('sits beside the target, is hidden, and never repeats', () => {
    const path = join(dir, 'postings.ndjson')
    const a = tempPathFor(path)
    const b = tempPathFor(path)
    expect(dirname(a)).toBe(dir)
    expect(a.endsWith(TEMP_SUFFIX)).toBe(true)
    expect(a).toContain('.postings.ndjson.')
    expect(a).not.toBe(b)
    expect(existsSync(a)).toBe(false)
  })
})
