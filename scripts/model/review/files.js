import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { reviewDir } from '../paths.js'

// A review's working files, under scripts/model/data/review/<model>/ (git
// ignores data/, since they hold posting text):
//
//   samples.json   { model, version, drawn, outputs, samples: [...] }, the
//                  outputs being checked, drawn once (samples.js)
//   precheck.json  { "<sample id>": { "verdict": "right" | "wrong" |
//                  "unsure", "note": "why" } }, Claude's pre-check, written
//                  by a later step; starts as {}
//   verdicts.json  { "<sample id>": { "verdict": "right" | "wrong", "note",
//                  "at": ISO time } }, the owner's, saved on every click
const path = (model, name) => join(reviewDir(model), `${name}.json`)

export function readFile(model, name, fallback) {
  const file = path(model, name)
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback
}

// Written beside and renamed over, so a crash mid-write never leaves a
// verdicts file half written.
export function writeFile(model, name, value) {
  mkdirSync(reviewDir(model), { recursive: true })
  const file = path(model, name)
  writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`)
  renameSync(`${file}.tmp`, file)
}

// A sample drawn for an older model version is moved aside whole, verdicts
// and all, rather than mixed with a new model's outputs.
export function setAside(model, version) {
  const dir = reviewDir(model)
  if (existsSync(dir)) renameSync(dir, `${dir}-v${version}-${Date.now()}`)
}
