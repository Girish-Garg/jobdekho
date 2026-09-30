// What a logo really is, read from its first bytes rather than from the type
// its host declared: Instahyre's storage sends WebP logos as
// application/octet-stream, and a declared type is only a claim anyway. Only
// the raster formats below are ever recognised, so nothing that could carry
// script (SVG, HTML) is served, whatever it was labelled.
const ascii = (body, from, to) => body.subarray(from, to).toString('latin1')

const FORMATS = [
  ['image/png', (b) => b[0] === 0x89 && ascii(b, 1, 4) === 'PNG'],
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/gif', (b) => ascii(b, 0, 4) === 'GIF8'],
  ['image/webp', (b) => ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP'],
  ['image/avif', (b) => ascii(b, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(b, 8, 12))],
]

export function sniffType(body) {
  if (!body || body.length < 12) return null
  return FORMATS.find(([, test]) => test(body))?.[0] ?? null
}

// A declared type that says outright it is not a raster image is refused
// before its body is read: text, markup and SVG.
export const declaredNotRaster = (type) => /^text\/|html|xml|svg|json|javascript/i.test(type)
