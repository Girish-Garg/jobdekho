import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cachedFile } from '@jobdekho/store/cached-file.js'
import { writeAtomic } from '@jobdekho/store/atomic-write.js'

let dir
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'jobdekho-store-')) })
afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

function open(path) {
  const parse = vi.fn(JSON.parse)
  const file = cachedFile(path, { parse, serialize: JSON.stringify, empty: () => ({ empty: true }) })
  return { file, parse }
}

describe('cachedFile', () => {
  it('reads empty() for a missing file without creating it', () => {
    const path = join(dir, 'missing.json')
    const { file, parse } = open(path)
    expect(file.read()).toEqual({ empty: true })
    expect(existsSync(path)).toBe(false)
    expect(parse).not.toHaveBeenCalled()
  })

  it('parses once and hands back the same value until the file changes', () => {
    const path = join(dir, 'a.json')
    writeAtomic(path, '{"n":1}')
    const { file, parse } = open(path)
    const first = file.read()
    expect(file.read()).toBe(first)
    expect(file.read()).toBe(first)
    expect(parse).toHaveBeenCalledTimes(1)
  })

  it('notices a rewrite made by another process', () => {
    const path = join(dir, 'a.json')
    writeAtomic(path, '{"n":1}')
    const { file, parse } = open(path)
    expect(file.read()).toEqual({ n: 1 })
    // The scraper swapping in a new corpus under a running server is exactly
    // this: a rename by someone else, between two reads.
    writeAtomic(path, '{"n":22}')
    expect(file.read()).toEqual({ n: 22 })
    expect(parse).toHaveBeenCalledTimes(2)
  })

  it('write() replaces the memory copy without parsing it back', () => {
    const path = join(dir, 'a.json')
    const { file, parse } = open(path)
    const next = { n: 3 }
    file.write(next)
    expect(file.read()).toBe(next)
    expect(parse).not.toHaveBeenCalled()
    expect(readFileSync(path, 'utf8')).toBe('{"n":3}')
  })

  it('a file that disappears reads as empty again', () => {
    const path = join(dir, 'a.json')
    writeAtomic(path, '{"n":1}')
    const { file } = open(path)
    expect(file.read()).toEqual({ n: 1 })
    rmSync(path)
    expect(file.read()).toEqual({ empty: true })
  })
})
