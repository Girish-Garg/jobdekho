import pg from 'pg'

// This exists for a database that is briefly not there, and for nothing else.
// It was first sized for a suspended Neon compute, measured at 4144ms to wake.
// That cause is gone: a local Postgres in the same compose network never
// suspends, and `depends_on: service_healthy` holds the app back until
// pg_isready answers over TCP. What is left is narrower. `docker compose
// restart db` under a running server drops every open connection and refuses
// new ones until Postgres is listening again, and a scraper or the migrate
// CLI started from the host can run before the container is up at all. The
// budget is deliberately unchanged, since nothing measured argues for less:
// five attempts give four gaps of 500, 1000, 2000 and 4000ms, 7.5s of waiting
// even if every attempt fails instantly. Measured here, an already
// initialised Postgres 17 container accepted connections again 1.5s after
// `docker compose restart db` began (compose called it healthy at 3.4s), so
// the budget covers a restart several times over.
export const MAX_ATTEMPTS = 5
const BASE_DELAY_MS = 500

function backoffMs(attempt) {
  return BASE_DELAY_MS * 2 ** (attempt - 1)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// pg keeps the two halves apart in a way Neon's HTTP wrapper did not: anything
// Postgres itself said arrives as a DatabaseError carrying the SQLSTATE in
// `code` (node_modules/pg-protocol/dist/messages.js), and everything else is
// the transport failing before or beneath a query. That "everything else"
// has two shapes, both read off the installed 8.23 source and confirmed
// against the running container:
//   - Node's own socket errors, which pg passes through untouched. `code` is
//     a syscall name (also on the AggregateError Node throws for a refused
//     `localhost`, where it tried ::1 and 127.0.0.1 and both failed):
//     ECONNREFUSED when nothing is listening on the port,
//     EAI_AGAIN while the `db` service's compose DNS name is absent (which
//     is what a stopped db looks like from the app container), ENOTFOUND for
//     a name that never existed, ECONNRESET or EPIPE when the server goes
//     away mid-query.
//   - pg's own Errors, which carry no `code` at all: "Connection terminated
//     unexpectedly" when the server drops a live socket (pg/lib/client.js)
//     and the connect-timeout variants in pg-pool/index.js.
// A connection dropped while idle never reaches here at all: pg-pool reports
// it on its 'error' event (handled in client.js) and discards the client, so
// the next query simply opens a fresh connection.
// A DatabaseError is never retried, whatever its code. Postgres was reached
// and its answer is final: a constraint violation will not clear on its own,
// and a half-applied write must not be sent again. The one server answer a
// retry would help with, 57P03 "the database system is starting up", is
// exactly the state pg_isready reports as unhealthy, so the compose
// healthcheck removes it before this code can see it. Anything unrecognised
// is not retried either, so a bug in our own code cannot be retried into a
// loop.
const SOCKET_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EPIPE', 'EHOSTUNREACH',
])
const PG_TRANSPORT_MESSAGE =
  /^(Connection terminated|timeout expired|timeout exceeded when trying to connect|Client has encountered a connection error)/

export function isConnectionFailure(err) {
  if (!(err instanceof Error) || err instanceof pg.DatabaseError) return false
  return SOCKET_CODES.has(err.code) || PG_TRANSPORT_MESSAGE.test(err.message)
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
