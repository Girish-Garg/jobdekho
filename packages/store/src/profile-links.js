import { LINK_KINDS, linkKind, webAddress } from '@jobdekho/core/link-kind.js'

// How many links one entry, or the basics, keeps, and how long one may be:
// room for everything a person shows off, while a pasted essay never
// reaches a resume.
const MAX_LINKS = 12
const MAX_URL = 2000
const MAX_LABEL = 80

const label = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL) : '')

// A bare string is taken as an address, the shape a model or a hand edit
// to profile.json most often writes one in. A kind outside the list is
// read from the address instead of trusted.
function normalizeLink(input) {
  const src = typeof input === 'string' ? { url: input } : (input ?? {})
  const url = webAddress(src.url)
  if (!url || url.length > MAX_URL) return null
  return { kind: LINK_KINDS.includes(src.kind) ? src.kind : linkKind(url), url, label: label(src.label) }
}

// A list of links as the record keeps it: web addresses only (see
// webAddress in core), each address once, in the order given, at most
// twelve. A row the editor opened and never filled has no address, and is
// dropped here rather than saved as a blank.
export function normalizeLinks(input) {
  const seen = new Set()
  const out = []
  for (const item of Array.isArray(input) ? input : []) {
    const link = normalizeLink(item)
    if (!link || seen.has(link.url)) continue
    seen.add(link.url)
    out.push(link)
  }
  return out.slice(0, MAX_LINKS)
}

// An entry saved before entries held several links has one address in
// `link` and no list; that address becomes the list, of the kind its host
// says. Whatever writes the list owns it from then on, even an empty one.
export const entryLinks = (src) => normalizeLinks(Array.isArray(src.links) ? src.links : [src.link])
