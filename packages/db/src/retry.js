import { NeonDbError } from '@neondatabase/serverless'

// Measured today against the live instance: a suspended Neon compute took
// 4144ms to wake and answer a plain `select 1`. A waking compute can respond
// two ways, and the budget has to survive both. An attempt that lands
// mid-wake simply blocks until the compute answers, because nothing here
// imposes a timeout of its own - that is what the 4144ms `select 1` did, and
// it needs no backoff at all. But the failure that prompted this retried
// FAST: `npm run db:migrate` returned "fetch failed" rather than waiting.
// Against that, the backoff is the only thing covering the wake, so the sum
// of the gaps has to outlast it. Five attempts give four gaps of 500, 1000,
// 2000 and 4000ms, so 7.5s of waiting even if every attempt fails instantly.
// Three attempts gave 1.5s and would have given up around the two second
// mark, less than half way through the wake that was actually measured.
export const MAX_ATTEMPTS = 5
const BASE_DELAY_MS = 500

function backoffMs(attempt) {
  return BASE_DELAY_MS * 2 ** (attempt - 1)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// @neondatabase/serverless (see node_modules/@neondatabase/serverless/index.mjs,
// the neon() query function) wraps every failure in the same NeonDbError
// class, so the class alone cannot tell "never reached the database" apart
// from "the database rejected this":
//   - fetch() throwing outright - DNS/TLS failure, connection reset, or a
//     compute that is still suspended - is rewrapped as
//     `Error connecting to database: ${message}`, with no `code` set.
//   - a non-400 HTTP status from the Neon proxy (5xx) is rewrapped as
//     `Server error (HTTP status ...)`, also with no `code`.
//   - an actual Postgres error (bad SQL, a constraint violation, a
//     migration statement that turns out not to be idempotent) comes back
//     as HTTP 400 carrying the server's own JSON error body, and every
//     field from that body - crucially `code`, the Postgres SQLSTATE - is
//     copied onto the NeonDbError.
// So `code` being present is exactly "Postgres looked at a query and
// rejected it"; its absence covers everything that happened before a query
// ever reached Postgres. A bare TypeError('fetch failed') is undici's shape
// for a fetch() that throws before neon() gets a chance to wrap it -
// defensive, since nothing but neon()'s own try/catch guarantees the
// wrapping, and a future driver version (or a direct fetch call added
// elsewhere) could let one through unwrapped. Anything else is
// unrecognised and treated as non-retryable, so a genuine bug in our own
// code cannot be silently retried into a loop.
//
// Confidence: high for the NeonDbError branch - read directly off the
// installed 0.10.4 source, not inferred from docs. Lower for the bare
// TypeError branch, since it is defensive code for a case not observed to
// occur in this codebase's traced paths.
export function isConnectionFailure(err) {
  if (err instanceof NeonDbError) return !err.code
  return err instanceof TypeError && err.message === 'fetch failed'
}

// Retries `fn` only on a connection-level failure (see isConnectionFailure
// above). A SQL error propagates on the very first attempt: retrying a
// constraint violation is pointless, and retrying a partially-applied write
// is dangerous. Every call site that uses this must itself be safe to
// re-run in full, since that is what "connection failure" certifies here -
// the previous attempt never reached the database, so nothing it might have
// done needs undoing.
export async function withRetry(fn, { attempts = MAX_ATTEMPTS } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn()
    } catch (err) {
      if (!isConnectionFailure(err) || attempt === attempts) throw err
      await sleep(backoffMs(attempt))
    }
  }
  return undefined // unreachable: the loop above always returns or throws
}
