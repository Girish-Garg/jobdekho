import { describe, it, expect, vi, afterEach } from 'vitest'
import pg from 'pg'
import { withRetry, isConnectionFailure, MAX_ATTEMPTS } from '@jobdekho/db/retry.js'

// Mirrors what pg actually throws (see retry.js's own comment for where each
// shape was read off the installed source). A connection that never reached
// Postgres surfaces as Node's own socket error, passed through untouched.
function socketError(code = 'ECONNREFUSED', message = 'connect ECONNREFUSED 127.0.0.1:5432') {
  return Object.assign(new Error(message), { code, errno: -111, syscall: 'connect' })
}

// A connection Postgres dropped mid-flight is pg's own Error with no code.
function droppedConnection(message = 'Connection terminated unexpectedly') {
  return new Error(message)
}

// A failure Postgres itself produced is a DatabaseError carrying the SQLSTATE.
function sqlError(code = '23505', message = 'duplicate key value violates unique constraint') {
  const err = new pg.DatabaseError(message, message.length, 'error')
  err.code = code
  return err
}

describe('isConnectionFailure', () => {
  it('treats a refused connection as a connection failure', () => {
    expect(isConnectionFailure(socketError('ECONNREFUSED'))).toBe(true)
  })

  it('treats an unresolved or not-yet-resolvable host as a connection failure', () => {
    expect(isConnectionFailure(socketError('ENOTFOUND', 'getaddrinfo ENOTFOUND db'))).toBe(true)
    expect(isConnectionFailure(socketError('EAI_AGAIN', 'getaddrinfo EAI_AGAIN db'))).toBe(true)
  })

  // Seen from the host against a port nothing listens on: Node tries ::1 and
  // 127.0.0.1 for `localhost` and throws one AggregateError over both, with
  // an empty message of its own but the same syscall code.
  it("treats Node's AggregateError for a refused localhost as a connection failure", () => {
    const err = new AggregateError([socketError('ECONNREFUSED', 'connect ECONNREFUSED ::1:5432'),
      socketError('ECONNREFUSED')], '')
    err.code = 'ECONNREFUSED'
    expect(isConnectionFailure(err)).toBe(true)
  })

  it('treats a socket reset mid-query as a connection failure', () => {
    expect(isConnectionFailure(socketError('ECONNRESET', 'read ECONNRESET'))).toBe(true)
  })

  it("treats pg's own dropped-connection errors as connection failures", () => {
    expect(isConnectionFailure(droppedConnection())).toBe(true)
    expect(isConnectionFailure(droppedConnection('Connection terminated due to connection timeout'))).toBe(true)
    expect(isConnectionFailure(droppedConnection('timeout exceeded when trying to connect'))).toBe(true)
  })

  it('treats a DatabaseError carrying a Postgres code as a SQL error', () => {
    expect(isConnectionFailure(sqlError())).toBe(false)
  })

  // The invariant the whole file rests on: if Postgres ran something, its
  // answer stands. A constraint violation will not clear on its own and a
  // half-applied write must not be sent twice.
  it('never retries a DatabaseError from a statement Postgres actually ran', () => {
    expect(isConnectionFailure(sqlError('42P01', 'relation "postings" does not exist'))).toBe(false)
    expect(isConnectionFailure(sqlError('23505', 'duplicate key value'))).toBe(false)
    expect(isConnectionFailure(sqlError('08006', 'connection failure'))).toBe(false)
  })

  // 57P03 was unreachable while a container healthcheck held the app back
  // until pg_isready answered. Without one, a server part way through
  // starting answers it directly, and it means the connection was refused
  // rather than a statement run - the same case as ECONNREFUSED, reported a
  // few milliseconds later once Postgres can speak the protocol.
  it('retries a server that says it is still starting up', () => {
    expect(isConnectionFailure(sqlError('57P03', 'the database system is starting up'))).toBe(true)
  })

  it('does not treat an unrecognised error as a connection failure', () => {
    expect(isConnectionFailure(new Error('boom'))).toBe(false)
    expect(isConnectionFailure(new TypeError('fetch failed'))).toBe(false)
    // A Node error code that is not a socket failure - a missing file, say.
    expect(isConnectionFailure(socketError('ENOENT', 'no such file or directory'))).toBe(false)
  })

  it('does not treat a non-Error throw as a connection failure', () => {
    expect(isConnectionFailure('ECONNREFUSED')).toBe(false)
    expect(isConnectionFailure({ code: 'ECONNREFUSED' })).toBe(false)
    expect(isConnectionFailure(undefined)).toBe(false)
  })
})

describe('withRetry', () => {
  afterEach(() => vi.useRealTimers())

  it('retries a connection failure and then succeeds', async () => {
    vi.useFakeTimers()
    let calls = 0
    const fn = vi.fn(async () => {
      calls += 1
      if (calls < 2) throw socketError()
      return 'ok'
    })
    const result = withRetry(fn)
    await vi.runAllTimersAsync()
    await expect(result).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries a connection the server dropped mid-query', async () => {
    vi.useFakeTimers()
    let calls = 0
    const fn = vi.fn(async () => {
      calls += 1
      if (calls < 2) throw droppedConnection()
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
    const err = socketError()
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
      if (calls < 3) throw socketError()
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
