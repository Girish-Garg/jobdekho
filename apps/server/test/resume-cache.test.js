import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cacheKey, readCachedPdf, writeCachedPdf } from '@jobdekho/server/resume/cache.js'

let dir
afterEach(() => { if (dir) rmSync(dir, { recursive: true, force: true }) })

function store() {
  dir = mkdtempSync(join(tmpdir(), 'jobdekho-resume-cache-test-'))
  return { dir }
}

describe('cacheKey', () => {
  it('is the same key for the same template and tex', () => {
    expect(cacheKey('classic', 'same text')).toBe(cacheKey('classic', 'same text'))
  })

  it('changes when the tex changes, even by one character', () => {
    expect(cacheKey('classic', 'a')).not.toBe(cacheKey('classic', 'b'))
  })

  it('changes when only the template changes', () => {
    expect(cacheKey('classic', 'same text')).not.toBe(cacheKey('compact', 'same text'))
  })
})

describe('readCachedPdf / writeCachedPdf', () => {
  it('returns null for a resume never compiled before', () => {
    expect(readCachedPdf(store(), 'u1', 'classic-abc')).toBeNull()
  })

  it('round-trips the exact bytes written, under the person\'s own directory', () => {
    const s = store()
    const pdf = Buffer.from('%PDF-1.4 fake bytes')
    writeCachedPdf(s, 'u1', 'classic-abc', pdf)
    expect(readCachedPdf(s, 'u1', 'classic-abc')).toEqual(pdf)
  })

  it('keeps two people\'s caches apart even with the same key', () => {
    const s = store()
    writeCachedPdf(s, 'u1', 'classic-abc', Buffer.from('u1 pdf'))
    writeCachedPdf(s, 'u2', 'classic-abc', Buffer.from('u2 pdf'))
    expect(readCachedPdf(s, 'u1', 'classic-abc').toString()).toBe('u1 pdf')
    expect(readCachedPdf(s, 'u2', 'classic-abc').toString()).toBe('u2 pdf')
  })
})
