import { describe, it, expect, vi, afterEach } from 'vitest'
import pg from 'pg'
import { createPool, createDb } from '@jobdekho/db/client.js'

// Nothing here opens a socket: a pg Pool connects lazily on the first query,
// so its configuration can be checked without a database.
const URL = 'postgres://jobdekho:jobdekho@localhost:5432/jobdekho'

describe('createPool', () => {
  const pools = []
  afterEach(async () => {
    vi.restoreAllMocks()
    while (pools.length) await pools.pop().end()
  })

  it('returns a pg Pool that has not connected yet', () => {
    const pool = createPool(URL)
    pools.push(pool)
    expect(pool).toBeInstanceOf(pg.Pool)
    expect(pool.totalCount).toBe(0)
  })

  // The scraper, backfill and migrate CLI never call pool.end(); without this
  // an idle connection would keep each of them alive for ten seconds after
  // their last query.
  it('lets a one-shot process exit while connections sit idle', () => {
    const pool = createPool(URL)
    pools.push(pool)
    expect(pool.options.allowExitOnIdle).toBe(true)
  })

  // pg-pool emits 'error' when the server drops an idle connection. Without a
  // listener that is an unhandled 'error' event, which kills the process.
  it('survives an idle connection being dropped instead of crashing the process', () => {
    const pool = createPool(URL)
    pools.push(pool)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => pool.emit('error', new Error('Connection terminated unexpectedly'))).not.toThrow()
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Connection terminated unexpectedly'))
  })
})

describe('createDb', () => {
  it('drives drizzle through a pg Pool rather than a single client', async () => {
    const db = createDb(URL)
    expect(db.$client).toBeInstanceOf(pg.Pool)
    expect(typeof db.select).toBe('function')
    await db.$client.end()
  })
})
