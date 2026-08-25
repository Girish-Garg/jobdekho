import { describe, it, expect, vi, afterEach } from 'vitest'
import { NeonDbError } from '@neondatabase/serverless'
import { withRetry, isConnectionFailure, MAX_ATTEMPTS } from '@jobdekho/db/retry.js'

// Mirrors what @neondatabase/serverless actually throws (see retry.js's own
// comment for where this was read off the installed source): a failure that
// never reached Postgres is a NeonDbError with no `code`.
function connectionError(message = 'Error connecting to database: fetch failed') {
  const err = new NeonDbError(message)
  err.sourceError = new TypeError('fetch failed')
  return err
}

// A failure Postgres itself produced always carries the SQLSTATE `code`.
function sqlError(code = '23505') {
  const err = new NeonDbError('duplicate key value violates unique constraint')
  err.code = code
  return err
}

describe('isConnectionFailure', () => {
  it('treats a NeonDbError with no code as a connection failure', () => {
    expect(isConnectionFailure(connectionError())).toBe(true)
  })

  it('treats a NeonDbError carrying a Postgres code as a SQL error', () => {
    expect(isConnectionFailure(sqlError())).toBe(false)
  })

  it('treats a bare fetch TypeError as a connection failure', () => {
    expect(isConnectionFailure(new TypeError('fetch failed'))).toBe(true)
  })

  it('does not treat an unrecognised error as a connection failure', () => {
    expect(isConnectionFailure(new Error('boom'))).toBe(false)
    expect(isConnectionFailure(new TypeError('something else'))).toBe(false)
  })
})

describe('withRetry', () => {
  afterEach(() => vi.useRealTimers())

  it('retries a connection failure and then succeeds', async () => {
    vi.useFakeTimers()
    let calls = 0
    const fn = vi.fn(async () => {
      calls += 1
      if (calls < 2) throw connectionError()
      return 'ok'
    })
    const result = withRetry(fn)
    await vi.runAllTimersAsync()
    await expect(result).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not retry a SQL error - it propagates on the first attempt', async () => {
    const err = sqlError()
    const fn = vi.fn(async () => { throw err })
    await expect(withRetry(fn)).rejects.toBe(err)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('surfaces the final error once every attempt is exhausted', async () => {
    vi.useFakeTimers()
    const err = connectionError()
    const fn = vi.fn(async () => { throw err })
    const result = withRetry(fn)
    const assertion = expect(result).rejects.toBe(err)
    await vi.runAllTimersAsync()
    await assertion
    expect(fn).toHaveBeenCalledTimes(MAX_ATTEMPTS)
  })

  it('waits with growing backoff between attempts rather than retrying instantly', async () => {
    vi.useFakeTimers()
    let calls = 0
    const fn = vi.fn(async () => {
      calls += 1
      if (calls < 3) throw connectionError()
      return 'ok'
    })
    const result = withRetry(fn)

    expect(fn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(499)
    expect(fn).toHaveBeenCalledTimes(1) // still waiting out the first 500ms backoff
    await vi.advanceTimersByTimeAsync(1)
    expect(fn).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(999)
    expect(fn).toHaveBeenCalledTimes(2) // the second backoff doubled to 1000ms
    await vi.advanceTimersByTimeAsync(1)
    expect(fn).toHaveBeenCalledTimes(3)

    await expect(result).resolves.toBe('ok')
  })
})
