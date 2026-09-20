import { locateBinary } from '../ai/locate.js'

// Same PATH lookup the AI CLIs use (see ai/locate.js): once a shell is
// involved a "not found" never raises ENOENT the way spawn's own error does,
// so the lookup happens here, once, ahead of ever spawning anything.
const BINARY = 'pdflatex'

export function locatePdflatex(env = process.env) {
  return locateBinary(BINARY, { env })
}
