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
  busy: 503,
  timeout: 504,
  failed: 502,
  unreadable: 422,
}

// A CLI's own wording ends in a full stop often enough that appending one blindly
// reads as a typo.
const trimStop = (detail) => String(detail).trim().replace(/\.$/, '')

// Which CLI is missing depends on the action's policy and on what else is
// installed, which select.js knows and this file does not, so its sentence
// arrives whole as the detail. The plain sentence is for the not_found
// raised inside a call, when a binary the probe found is gone by the time
// it is run.
const MESSAGE = {
  not_found: (p, detail) => detail
    || `${p.label} is not installed, or is not on the PATH JobDekho was started with. `
    + `Install it from ${p.install}, then restart JobDekho.`,
  login: (p, detail) =>
    `${p.label} is not signed in (${trimStop(detail)}). `
    + `Open a terminal, run "${p.binary}", finish signing in, then try again.`,
  // Claude Code refreshes its sign-in token in place, and a second process
  // that needs it while the first is mid-refresh is told to wait. That is not
  // a signed-out CLI, and telling the person to sign in again sent them to fix
  // something that was never broken.
  busy: (p, detail) =>
    `${p.label} is busy refreshing its sign-in, usually because another ${p.label} window is doing the same `
    + `(${trimStop(detail)}). JobDekho tried again and it was still busy. Wait a minute and try again.`,
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

// Which kind a CLI's own failure sentence is, decided in one place because
// three places used to decide it (both unwrappers and a non-zero exit).
// Busy is asked first: Claude Code's refresh race says "OAuth token", which
// the login pattern also matches, and a transient wait must not read as a
// broken sign-in.
export function classify(provider, detail) {
  if (provider.busyPattern?.test(detail)) return 'busy'
  if (provider.loginPattern.test(detail)) return 'login'
  return 'failed'
}

export class ProviderError extends Error {
  constructor(kind, provider, detail = '') {
    super(MESSAGE[kind](provider, detail))
    this.name = 'ProviderError'
    this.kind = kind
    this.provider = provider.id
    this.status = STATUS[kind]
  }
}
