import { readFileSync } from 'node:fs'
import { MODEL_VERSIONS } from './version.js'

// The shipped weights, as scripts/model/compact.js writes them:
//
//   { name, version, classes, temperature, thresholds, minWords, scale,
//     bias: [int], features: [name], weights: [int] }
//
// weights holds one row of classes.length integers per feature, in the
// order of features; every integer is the weight times scale. Small weights
// were pruned before writing, which is what keeps the file small.
export function decodeModel(json) {
  const K = json.classes.length
  const index = new Map(json.features.map((name, row) => [name, row]))
  const W = Float32Array.from(json.weights, (v) => v / json.scale)
  if (W.length !== json.features.length * K) throw new Error(`${json.name}: ${W.length} weights for ${json.features.length} features`)
  return {
    name: json.name,
    version: json.version,
    classes: json.classes,
    K,
    index,
    W,
    bias: Float32Array.from(json.bias, (v) => v / json.scale),
    temperature: json.temperature ?? 1,
    thresholds: json.thresholds ?? {},
    minWords: json.minWords ?? 0,
  }
}

const loaded = new Map()

// The shipped model by name ('level' or 'sections'), read once and kept.
// null when its file is missing, unreadable or of another version than the
// code expects: tagging then goes on without estimates rather than failing,
// and never mixes a stale model's numbers with this code's thresholds.
export function shippedModel(name) {
  if (loaded.has(name)) return loaded.get(name)
  let model = null
  try {
    const json = JSON.parse(readFileSync(new URL(`./weights/${name}.json`, import.meta.url), 'utf8'))
    if (json.version === MODEL_VERSIONS[name]) model = decodeModel(json)
  } catch {
    model = null
  }
  loaded.set(name, model)
  return model
}
