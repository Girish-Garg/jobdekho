import { describe, it, expect } from 'vitest'
import { sniffType, declaredNotRaster } from '@jobdekho/server/logos/sniff.js'

const bytes = (...parts) => Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))))

describe('sniffType', () => {
  it('knows the raster formats by their first bytes', () => {
    expect(sniffType(bytes([0x89], 'PNG', [13, 10, 26, 10, 0, 0, 0, 0]))).toBe('image/png')
    expect(sniffType(bytes([0xff, 0xd8, 0xff, 0xe0], 'JFIF0000'))).toBe('image/jpeg')
    expect(sniffType(bytes('GIF89a', [0, 0, 0, 0, 0, 0]))).toBe('image/gif')
    expect(sniffType(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '))).toBe('image/webp')
    expect(sniffType(bytes([0, 0, 0, 28], 'ftyp', 'avif', [0, 0]))).toBe('image/avif')
  })

  it('recognises nothing that could carry script', () => {
    expect(sniffType(bytes('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
    expect(sniffType(bytes('<!doctype html><script>'))).toBeNull()
    expect(sniffType(bytes('short'))).toBeNull()
    expect(sniffType(null)).toBeNull()
  })
})

describe('declaredNotRaster', () => {
  it('refuses types that say outright they are not raster images', () => {
    for (const type of ['text/html', 'image/svg+xml', 'application/xml', 'application/json']) expect(declaredNotRaster(type)).toBe(true)
    for (const type of ['image/png', 'application/octet-stream', '']) expect(declaredNotRaster(type)).toBe(false)
  })
})
