import { createHttp } from '@jobdekho/sources/http.js'
import { createHostGate } from '@jobdekho/sources/host-gate.js'
import { politeGet, Refused } from '@jobdekho/sources/boards/linkedin-polite.js'
import { describable, describePosting } from '@jobdekho/sources/describe.js'
import { linkedinOn } from './linkedin-setting.js'
import { normalizeGuard, recordSweep } from './linkedin-guard.js'
import { shortDay } from './linkedin-note.js'

const DAY_MS = 24 * 60 * 60 * 1000

export const LINKEDIN_OFF = 'LinkedIn is switched off in Settings, so JobDekho does not contact it. Turn on "Include LinkedIn" to fetch this description.'

const refuse = (status, error) => ({ status, error })

// Fetching one posting's description when a person opens it and the scrape
// has not described it yet (see the server's describe route): one request,
// made the polite way. LinkedIn is asked only while "Include LinkedIn" is
// on and its guard is not paused, through the same paced requester a sweep
// uses, one request at a time, and a refusal pauses it for the next sweep
// too. A fetch that failed is not tried again for a day, so a person
// reopening a posting does not repeat a request that already failed.
//
// `http`, `now`, `wait` and `random` are for tests, which never reach a board.
export function createDescriber(db, { http = createHttp({ gate: createHostGate() }), now = Date.now, wait, random } = {}) {
  const get = politeGet(http, { wait, random, now })
  const failed = new Map()
  const running = new Map()
  let turn = Promise.resolve()
  const inTurn = (step) => {
    const run = turn.then(step, step)
    turn = run.catch(() => {})
    return run
  }

  async function fetchPage(userId, row) {
    const linkedin = row.source === 'linkedin'
    if (linkedin && !linkedinOn(db, userId)) return refuse(403, LINKEDIN_OFF)
    const guard = normalizeGuard(db.linkedinGuard.get())
    if (linkedin && guard.pausedUntil && now() < Date.parse(guard.pausedUntil)) {
      return refuse(429, `LinkedIn asked JobDekho to slow down, so it is left alone until ${shortDay(guard.pausedUntil)}.`)
    }
    if (now() - (failed.get(row.id) ?? -Infinity) < DAY_MS) return refuse(409, 'This description could not be fetched earlier today; JobDekho will not ask again until tomorrow.')
    try {
      const page = linkedin ? await inTurn(() => describePosting({ get }, row)) : await describePosting({ http }, row)
      if (!String(page?.description || '').trim()) throw new Error('no description')
      return { page }
    } catch (err) {
      failed.set(row.id, now())
      if (!(err instanceof Refused)) return refuse(502, 'The board did not give a description for this posting. Try again tomorrow.')
      db.linkedinGuard.set(recordSweep(guard, { answered: 1, refusal: { reason: err.message, retryAfterMs: err.retryAfterMs } }, now()))
      return refuse(429, 'LinkedIn asked JobDekho to slow down, so it will be left alone for a while.')
    }
  }

  // { page } with what the posting's own page says, or { status, error }.
  // Two opens of one posting at once share the one request.
  return function describe(userId, row) {
    if (!describable(row.source)) return Promise.resolve(refuse(409, 'This board publishes no description to fetch.'))
    if (!running.has(row.id)) running.set(row.id, fetchPage(userId, row).finally(() => running.delete(row.id)))
    return running.get(row.id)
  }
}
