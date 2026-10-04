import { MODEL_VERSIONS } from '@jobdekho/core/model/version.js'
import { loadPostings, defaultFiles } from '../postings.js'
import { OUTPUTS } from './outputs.js'
import { drawSample } from './samples.js'
import { readFile, writeFile, setAside } from './files.js'

// The sample a review checks, drawn once and kept (samples.js): reused for
// as long as it is the shipped version's, else the old review is moved
// aside whole and a new sample drawn from the postings files, by default
// the corpus the app keeps on this machine. Claude's pre-check file starts
// empty beside it, for a later step to fill.
export function drawnSample(model, paths = []) {
  const version = MODEL_VERSIONS[model]
  const saved = readFile(model, 'samples', null)
  if (saved?.version === version) return saved
  if (saved) setAside(model, saved.version)
  const { postings } = loadPostings(paths.length ? paths : defaultFiles())
  const outputs = OUTPUTS[model](postings)
  const drawn = { model, version, drawn: new Date().toISOString().slice(0, 10), outputs: outputs.length, samples: drawSample(outputs) }
  writeFile(model, 'samples', drawn)
  if (!readFile(model, 'precheck', null)) writeFile(model, 'precheck', {})
  return drawn
}
