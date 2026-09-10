import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'

// One place decides how a connection to Postgres is opened, shared by the
// server, the scraper and the migrate CLI. A Pool rather than a Client
// because the server answers requests concurrently and a single Client
// serialises every query behind the one before it.
export function createPool(url) {
  const pool = new pg.Pool({
    connectionString: url,
    // The scraper, backfill and migrate CLI are one-shot processes that never
    // call pool.end(). Without this, their idle connections keep the event
    // loop alive for idleTimeoutMillis (10s) after the last query, so every
    // run would hang for ten seconds after printing "Done.".
    allowExitOnIdle: true,
  })
  // pg-pool emits 'error' for an idle connection the server drops, which is
  // what restarting Postgres under a running server looks like.
  // With no listener Node treats that as an unhandled 'error' event and
  // kills the process, even though the pool has already discarded the
  // connection and the next query would simply open a fresh one.
  pool.on('error', (err) => console.error(`db: idle connection dropped: ${err.message}`))
  return pool
}

export function createDb(url) {
  return drizzle(createPool(url), { schema })
}
