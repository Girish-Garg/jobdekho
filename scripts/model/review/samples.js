import { seeded, shuffled } from '../random.js'

// The sample a review checks: up to SIZE of the model's outputs, drawn once
// with a fixed seed and saved, so every session reviews the same ones.
//
// Stratified: each group (a pair of levels, a section) gets its share of
// the sample in proportion to how often the model shows it, so the overall
// precision is estimated without bias. Within a group, outputs are spread
// across companies, at most PER_COMPANY from any one at first: one
// company's template repeats one mistake across all its postings, and a
// sample crowded with it would say more about that company than the model.
export const SIZE = 250
const PER_COMPANY = 2

export function allocate(counts, size) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const n = Math.min(size, total)
  const exact = Object.entries(counts).map(([group, c]) => ({ group, c, share: (n * c) / Math.max(1, total) }))
  const quota = Object.fromEntries(exact.map((e) => [e.group, Math.min(e.c, Math.floor(e.share))]))
  let left = n - Object.values(quota).reduce((a, b) => a + b, 0)
  for (const e of [...exact].sort((a, b) => (b.share % 1) - (a.share % 1))) {
    if (left <= 0) break
    if (quota[e.group] < e.c) {
      quota[e.group] += 1
      left -= 1
    }
  }
  return quota
}

// `perCompany` counts across the whole sample, so the cap holds overall.
function spread(outputs, want, random, perCompany) {
  const picked = []
  const taken = new Set()
  for (const cap of [PER_COMPANY, PER_COMPANY * 2, Infinity]) {
    for (const o of shuffled(outputs, random)) {
      if (picked.length >= want) return picked
      if (taken.has(o.id) || (perCompany.get(o.companyKey) ?? 0) >= cap) continue
      picked.push(o)
      taken.add(o.id)
      perCompany.set(o.companyKey, (perCompany.get(o.companyKey) ?? 0) + 1)
    }
  }
  return picked
}

// The sample, in a seeded order so groups and companies interleave.
export function drawSample(outputs, { size = SIZE, seed = 20261004 } = {}) {
  const random = seeded(seed)
  const groups = {}
  for (const o of [...outputs].sort((a, b) => a.id.localeCompare(b.id))) (groups[o.group] ??= []).push(o)
  const quota = allocate(Object.fromEntries(Object.entries(groups).map(([g, list]) => [g, list.length])), size)
  const perCompany = new Map()
  const picked = Object.entries(groups).flatMap(([group, list]) => spread(list, quota[group], random, perCompany))
  return shuffled(picked, random)
}
