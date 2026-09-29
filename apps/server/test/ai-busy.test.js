import { describe, it, expect, vi } from 'vitest'
import { callProvider } from '@jobdekho/server/ai/call.js'
import { classify } from '@jobdekho/server/ai/errors.js'
import { CLAUDE, AGY } from '@jobdekho/server/ai/providers.js'

// The exact sentence Claude Code 2.1.281 printed while another Claude Code
// process held its sign-in token. It says "OAuth", which the login pattern
// matches, so it used to reach the person as "not signed in, go and sign in"
// about a CLI that was signed in the whole time.
const REFRESH_RACE = 'Failed to refresh OAuth token: another Claude Code process is refreshing it or exited mid-refresh. This is usually transient; retry in a minute'

const envelope = (result, extra = {}) => JSON.stringify({ type: 'result', result, ...extra })
const busy = { stdout: envelope(REFRESH_RACE, { is_error: true }), stderr: '', code: 1 }
const answered = { stdout: envelope('pong'), stderr: '', code: 0 }
const expired = { stdout: envelope('Failed to authenticate: OAuth session expired', { is_error: true }), stderr: '', code: 1 }

const seams = (run) => ({
  run, locate: () => '/usr/local/bin/claude', scratch: (work) => work('/scratch'), sleep: vi.fn(async () => {}),
})

describe('classify', () => {
  it('reads the refresh race as busy, not as a broken sign-in', () => {
    expect(classify(CLAUDE, REFRESH_RACE)).toBe('busy')
  })

  it('still reads a real expired session as a login problem', () => {
    expect(classify(CLAUDE, 'Failed to authenticate: OAuth session expired')).toBe('login')
  })

  it('falls through to failed for anything else, and needs no busy pattern to do it', () => {
    expect(classify(CLAUDE, 'model overloaded')).toBe('failed')
    expect(classify(AGY, 'Please sign in to view available models')).toBe('login')
  })
})

describe('callProvider on a busy CLI', () => {
  it('asks again and returns the answer once the refresh settles', async () => {
    const run = vi.fn().mockResolvedValueOnce(busy).mockResolvedValueOnce(answered)
    const s = seams(run)
    const events = []
    const out = await callProvider({ provider: CLAUDE, tools: 'none', prompt: 'hi', emit: (e) => events.push(e), ...s })
    expect(out.text).toBe('pong')
    expect(run).toHaveBeenCalledTimes(2)
    expect(s.sleep).toHaveBeenCalledTimes(1)
    expect(events.some((e) => e.stage === 'retry' && e.attempt === 2)).toBe(true)
  })

  it('gives up after two retries with a sentence that says to wait, not to sign in', async () => {
    const run = vi.fn().mockResolvedValue(busy)
    const err = await callProvider({ provider: CLAUDE, tools: 'none', prompt: 'hi', ...seams(run) }).catch((e) => e)
    expect(run).toHaveBeenCalledTimes(3)
    expect(err.kind).toBe('busy')
    expect(err.message).toMatch(/busy refreshing its sign-in/)
    expect(err.message).toMatch(/Wait a minute/)
    expect(err.message).not.toMatch(/finish signing in/)
  })

  // A signed-out CLI stays signed out however many times it is asked, and
  // each ask is a process start the person waits through.
  it('does not retry a real login failure', async () => {
    const run = vi.fn().mockResolvedValue(expired)
    const err = await callProvider({ provider: CLAUDE, tools: 'none', prompt: 'hi', ...seams(run) }).catch((e) => e)
    expect(run).toHaveBeenCalledTimes(1)
    expect(err.kind).toBe('login')
  })
})
