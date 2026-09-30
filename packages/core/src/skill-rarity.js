// How rare each skill is as a job requirement across the stored postings,
// scaled so a typical skill weighs 1 and clamped so no single skill can
// decide a posting alone. Matching Kubernetes says more than matching SQL,
// which a quarter of these ads ask for. Measured on this corpus rather than
// on general text, because here a word rare in English can be everywhere.
//
// Only skills named in five or more postings set the scale: a skill seen
// once would otherwise drag the mean and inflate every other weight.
const MIN_TO_SCALE = 5

export function skillRarity(featureList) {
  const df = new Map()
  let n = 0
  for (const f of featureList) {
    n += 1
    for (const id of Object.keys(f?.skills ?? {})) df.set(id, (df.get(id) ?? 0) + 1)
  }
  const idf = new Map([...df].map(([id, d]) => [id, Math.log((n + 1) / (d + 1)) + 1]))
  const scaled = [...df].filter(([, d]) => d >= MIN_TO_SCALE).map(([id]) => idf.get(id))
  const mean = scaled.length ? scaled.reduce((a, b) => a + b, 0) / scaled.length : 1
  return (id) => Math.min(2, Math.max(0.5, (idf.get(id) ?? mean) / mean))
}

// Before any corpus is measured every skill weighs the same.
export const flatRarity = () => 1
