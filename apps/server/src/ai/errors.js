// Each kind needs a different action from the person at the browser: install
// something, sign in somewhere, wait and retry. The sentence says which, and
// the kind travels with it so a UI can offer the matching button without
// parsing prose.
//
// Every status here is one Fastify's error handler would hide behind "internal
// server error", which is why answer() in ndjson.js turns these into a body
// itself rather than letting them propagate.
const STATUS = {
  not_found: 503,
  login: 503,
  timeout: 504,
  failed: 502,
  unreadable: 422,
}

// A CLI's own wording ends in a full stop often enough that appending one blindly
// reads as a typo.
const trimStop = (detail) => String(detail).trim().replace(/\.$/, '')

const MESSAGE = {
  not_found: (p) =>
    `${p.label} is not installed, or is not on the PATH JobDekho was started with. `
    + `Install it from ${p.install}, then restart JobDekho.`,
  login: (p, detail) =>
    `${p.label} is not signed in (${trimStop(detail)}). `
    + `Open a terminal, run "${p.binary}", finish signing in, then try again.`,
  timeout: (p, detail) =>
    `${p.label} did not answer within ${detail}. `
    + `Try again; if it keeps happening, check that "${p.binary}" answers from a terminal.`,
  failed: (p, detail) =>
    `${p.label} could not finish: ${trimStop(detail)}. `
    + `Try again; if it keeps happening, run "${p.binary}" from a terminal to see the full error.`,
  unreadable: (p) =>
    `${p.label} answered, but the reply was not in the shape JobDekho expected. Try again.`,
}

export const FAILURE_KINDS = Object.keys(STATUS)

export class ProviderError extends Error {
  constructor(kind, provider, detail = '') {
    super(MESSAGE[kind](provider, detail))
    this.name = 'ProviderError'
    this.kind = kind
    this.provider = provider.id
    this.status = STATUS[kind]
  }
}
