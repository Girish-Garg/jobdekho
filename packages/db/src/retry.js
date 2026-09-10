import pg from 'pg'

// This exists for a database that is briefly not there, and for nothing else.
// It was first sized for a suspended Neon compute, measured at 4144ms to wake,
// and that cause is gone. Two narrower ones are not: Postgres restarted under
// a running server drops every open connection and refuses new ones until it
// is listening again, and the scraper or the migrate CLI can be started
// before it is up at all.
//
// Five attempts give four gaps of 500, 1000, 2000 and 4000ms, so 7.5s of
// waiting even if every attempt fails instantly. Measured against a local
// Postgres 17, an already initialised server accepted connections again 1.5s
// after a restart began, so the budget covers one several times over.
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
// has two shapes, both read off the installed 8.23 source:
//   - Node's own socket errors, which pg passes through untouched. `code` is
//     a syscall name (also on the AggregateError Node throws for a refused
//     `localhost`, where it tried ::1 and 127.0.0.1 and both failed):
//     ECONNREFUSED when nothing is listening on the port, ENOTFOUND or
//     EAI_AGAIN for a host that does not resolve, ECONNRESET or EPIPE when
//     the server goes away mid-query.
//   - pg's own Errors, which carry no `code` at all: "Connection terminated
//     unexpectedly" when the server drops a live socket (pg/lib/client.js)
//     and the connect-timeout variants in pg-pool/index.js.
// A connection dropped while idle never reaches here at all: pg-pool reports
// it on its 'error' event (handled in client.js) and discards the client, so
// the next query simply opens a fresh connection.
const SOCKET_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'EPIPE', 'EHOSTUNREACH',
])
const PG_TRANSPORT_MESSAGE =
  /^(Connection terminated|timeout expired|timeout exceeded when trying to connect|Client has encountered a connection error)/

// A DatabaseError is Postgres answering, and its answer is final: a constraint
// violation will not clear on its own and a half-applied write must not be
// sent again. 57P03 is the one exception, and it only became reachable when
// the container healthcheck went away. It means "the database system is
// starting up", so the server refused the connection rather than running
// anything - the same situation as a refused socket, reported a few
// milliseconds later once Postgres is far enough along to speak the protocol.
// Retrying it is safe for exactly the reason retrying the others is: no
// statement was executed.
const STARTING_UP = '57P03'

export function isConnectionFailure(err) {
  if (!(err instanceof Error)) return false
  if (err instanceof pg.DatabaseError) return err.code === STARTING_UP
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
