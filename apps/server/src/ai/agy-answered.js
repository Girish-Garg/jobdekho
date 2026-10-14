import { asResult, parseLine } from './agy.js'

// Whether the stream has its result yet, a whole line of it: the run is
// then over, whether or not agy has exited (see spawn.js). Read from the
// last result-looking line only, since this is asked at every piece of output.
const RESULT = /"event"\s*:\s*"result"/g
const NEWLINE = String.fromCharCode(10)

export function agyAnswered(stdout) {
  const text = String(stdout || '')
  const at = [...text.matchAll(RESULT)].at(-1)?.index
  if (at === undefined) return false
  const end = text.indexOf(NEWLINE, at)
  if (end === -1) return false
  return asResult(parseLine(text.slice(text.lastIndexOf(NEWLINE, at) + 1, end))) !== null
}

// What the registry entry takes from this (see providers.js): it always
// writes as it goes, and the line above ends its run.
export const AGY_ENDS = { streams: true, answered: agyAnswered }
