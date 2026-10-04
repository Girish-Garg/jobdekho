// Everything random in training is seeded, so the same postings give the
// same folds, the same shuffles and the same weights on every run.
export const SEED = 20261004
export const FOLDS = 5

// mulberry32: small, fast and good enough to shuffle training examples.
export function seeded(seed = SEED) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// FNV-1a over the code points, for a stable number from a string.
export function hash(text, seed = SEED) {
  let h = (2166136261 ^ seed) >>> 0
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

// The fold a company's postings all sit in. Split by company, never by
// posting: one company's template repeats across its postings, and a model
// tested on a company it trained on would be graded on what it memorised.
export const foldOf = (companyKey, folds = FOLDS) => hash(`fold:${companyKey}`) % folds

export function shuffled(list, random) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const kept = out[i]
    out[i] = out[j]
    out[j] = kept
  }
  return out
}
