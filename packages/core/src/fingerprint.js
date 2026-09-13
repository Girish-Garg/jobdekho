import { createHash } from 'node:crypto'

// A content fingerprint of the job body, meant for the duplicate every other
// key misses: the same role listed by the employer and again by an
// aggregator that rewrote the title. Title and company cannot see that pair
// and neither can the URL, since an aggregator hands out its own redirector.
// Technique borrowed from career-ops (MIT): 64-bit SimHash over 3-token
// shingles.
//
// MEASURED AND NOT WIRED INTO THE FEED. Over the 2238 bodies in the corpus,
// with shared boilerplate stripped first (boilerplate.js), no pair across two
// sources reached 0.92: the aggregators that store a body (Internshala) list
// companies the ATS boards do not, and the two that overlap the boards
// (LinkedIn, Instahyre) store no body at all. Within one source, of the 24
// pairs at exactly 1.000 that title+company had not already grouped, 11 were
// different requisitions sharing one ad: Staff against Principal, AMER
// against EMEA, "Solutions Architect" against "Solutions Architect - India".
// Identical bodies leave no threshold to set, and requiring the titles to
// agree too (Jaccard 0.8) left 5 pairs, one still a level pair. So the feed
// keeps title+company and this stays a library, its false positive pinned by test.

// Below this there is not enough text to tell a real match from shared
// boilerplate, so no fingerprint is produced: no body, no signal, no false
// positive, as ghost.js treats absent data. After stripping, 119 of 2287 fall under it.
export const MIN_TEXT = 200

// At most 5 of 64 bits apart. Even that let two different Canonical roles
// through at 0.953 raw, 26 of their 31 sentences being company template. The
// fix is stripping, not a tighter bar: a repost with one edited line must clear it.
export const CROSSLIST_THRESHOLD = 0.92

const SHINGLE = 3

export function normalizeJdText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

// Shingles rather than single words, so that reordered boilerplate does not
// collide: "we are hiring a backend" and "a backend we are hiring" share every
// word and almost no 3-token run.
function shingles(tokens) {
  const out = []
  for (let i = 0; i + SHINGLE <= tokens.length; i += 1) out.push(tokens.slice(i, i + SHINGLE).join(' '))
  return out
}

// Each shingle votes on all 64 bits, and the sign of the tally becomes the
// bit. That is what makes the result stable under small edits: changing one
// sentence moves a handful of votes, not the whole hash, which a plain digest
// would never survive.
export function fingerprint(text) {
  const normalized = normalizeJdText(text)
  if (normalized.length < MIN_TEXT) return ''
  const parts = shingles(normalized.split(' '))
  if (!parts.length) return ''
  const votes = new Array(64).fill(0)
  for (const part of parts) {
    const digest = createHash('sha1').update(part).digest()
    for (let bit = 0; bit < 64; bit += 1) {
      votes[bit] += (digest[bit >> 3] >> (7 - (bit & 7))) & 1 ? 1 : -1
    }
  }
  let hex = ''
  for (let nibble = 0; nibble < 16; nibble += 1) {
    let value = 0
    for (let bit = 0; bit < 4; bit += 1) value = (value << 1) | (votes[nibble * 4 + bit] > 0 ? 1 : 0)
    hex += value.toString(16)
  }
  return hex
}

const FINGERPRINT_RE = /^[0-9a-f]{16}$/

function popcount(x) {
  let n = x - ((x >> 1) & 0x55555555)
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
  return (((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24
}

// Kept as two 32-bit halves rather than a BigInt: this runs once per pair over
// thousands of rows, and the XOR-and-popcount stays in integer registers.
// An absent or malformed fingerprint never matches, rather than matching
// everything that is equally absent.
export function similarity(a, b) {
  if (!FINGERPRINT_RE.test(a || '') || !FINGERPRINT_RE.test(b || '')) return 0
  const hi = (parseInt(a.slice(0, 8), 16) | 0) ^ (parseInt(b.slice(0, 8), 16) | 0)
  const lo = (parseInt(a.slice(8), 16) | 0) ^ (parseInt(b.slice(8), 16) | 0)
  return 1 - (popcount(hi) + popcount(lo)) / 64
}

export function isCrossListing(a, b, threshold = CROSSLIST_THRESHOLD) {
  return similarity(a, b) >= threshold
}
