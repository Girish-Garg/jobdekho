import { describe, it, expect, vi } from 'vitest'
import { locateBinary } from '@jobdekho/server/ai/locate.js'
import { unwrapClaude } from '@jobdekho/server/ai/claude.js'
import { CLAUDE, PROVIDERS, providerById } from '@jobdekho/server/ai/providers.js'
import { callProvider } from '@jobdekho/server/ai/call.js'
import { createDetector } from '@jobdekho/server/ai/detect.js'
import { ProviderError, FAILURE_KINDS } from '@jobdekho/server/ai/errors.js'
import { readNdjson, startEvent, progressEvent, isEvent } from '@jobdekho/server/ai/events.js'
import { runCli } from '@jobdekho/server/ai/spawn.js'

const HERE = () => '/usr/local/bin/claude'
const NOWHERE = () => null
const envelope = (result, extra = {}) => JSON.stringify({ type: 'result', result, ...extra })
const answering = (stdout) => async () => ({ stdout, stderr: '', code: 0 })

async function rejection(promise) {
  try { await promise } catch (err) { return err }
  throw new Error('expected a rejection')
}

function thrown(fn) {
  try { fn() } catch (err) { return err }
  throw new Error('expected a throw')
}

describe('locateBinary', () => {
  it('walks PATH in order and returns the first runnable match', () => {
    const exists = (f) => f === '/opt/bin/claude' || f === '/home/me/bin/claude'
    const env = { PATH: '/usr/bin:/opt/bin:/home/me/bin' }
    expect(locateBinary('claude', { env, platform: 'linux', exists })).toBe('/opt/bin/claude')
  })

  it('returns null when nothing on PATH matches', () => {
    expect(locateBinary('claude', { env: { PATH: '/usr/bin' }, platform: 'linux', exists: () => false })).toBeNull()
    expect(locateBinary('claude', { env: {}, platform: 'linux', exists: () => true })).toBeNull()
  })

  // An npm install leaves a bare `gemini` sh script next to gemini.cmd, and
  // cmd.exe can only run the second, so the bare name must not count.
  it('on Windows accepts only the PATHEXT forms, reading Path as well as PATH', () => {
    const files = new Set(['C:\\nvm\\gemini', 'C:\\nvm\\gemini.cmd', 'C:\\Users\\me\\.local\\bin\\claude.exe'])
    const env = { Path: 'C:\\Users\\me\\.local\\bin;C:\\nvm', PATHEXT: '.COM;.EXE;.BAT;.CMD' }
    const exists = (f) => files.has(f)
    expect(locateBinary('gemini', { env, platform: 'win32', exists })).toBe('C:\\nvm\\gemini.cmd')
    expect(locateBinary('claude', { env, platform: 'win32', exists })).toBe('C:\\Users\\me\\.local\\bin\\claude.exe')
    expect(locateBinary('codex', { env, platform: 'win32', exists })).toBeNull()
  })
})

describe('the provider registry', () => {
  it('knows Claude Code and finds it by id', () => {
    expect(PROVIDERS.map((p) => p.id)).toEqual(['claude'])
    expect(providerById('claude')).toBe(CLAUDE)
    expect(providerById('antigravity')).toBeNull()
  })

  it('drives it in one-shot mode with a JSON reply and no prompt on the command line', () => {
    expect(CLAUDE.promptArgs).toEqual(['-p', '--output-format', 'json'])
    expect(CLAUDE.versionArgs).toEqual(['--version'])
  })
})

describe('unwrapClaude', () => {
  it('unwraps the --output-format json envelope to the text inside', () => {
    expect(unwrapClaude(envelope('{"skills":["go"]}'), CLAUDE)).toBe('{"skills":["go"]}')
  })

  // Older CLI versions print the reply bare.
  it('returns a bare reply as it is', () => {
    expect(unwrapClaude('{"skills":["go"]}', CLAUDE)).toBe('{"skills":["go"]}')
  })

  // The CLI reports failure as is_error WITH exit code 0, so an expired login
  // looks like success unless the envelope is checked.
  it('turns an is_error envelope into a login failure instead of a reply', () => {
    const failed = envelope('Failed to authenticate: OAuth session expired and could not be refreshed', { is_error: true })
    const err = thrown(() => unwrapClaude(failed, CLAUDE))
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.kind).toBe('login')
    expect(err.message).toMatch(/OAuth session expired/)
    expect(err.message).toMatch(/run "claude"/)
  })

  it('reports an is_error envelope that is not about signing in as failed', () => {
    const err = thrown(() => unwrapClaude(envelope('Rate limit reached.', { is_error: true }), CLAUDE))
    expect(err.kind).toBe('failed')
    expect(err.message).toMatch(/could not finish: Rate limit reached\. Try again/)
  })
})

describe('callProvider', () => {
  it('refuses before spawning anything when the binary is absent', async () => {
    const run = vi.fn()
    const err = await rejection(callProvider({ provider: CLAUDE, prompt: 'x', locate: NOWHERE, run }))
    expect(err.kind).toBe('not_found')
    expect(err.status).toBe(503)
    expect(err.message).toMatch(/Claude Code is not installed/)
    expect(err.message).toMatch(/claude\.ai\/code/)
    expect(run).not.toHaveBeenCalled()
  })

  it('sends the whole prompt over stdin with fixed arguments and returns the text', async () => {
    const run = vi.fn(answering(envelope('hello')))
    const out = await callProvider({ provider: CLAUDE, prompt: 'resume "here"; rm -rf /', locate: HERE, run })
    expect(out).toEqual({ provider: 'claude', text: 'hello' })
    expect(run).toHaveBeenCalledWith({
      file: '/usr/local/bin/claude', args: ['-p', '--output-format', 'json'],
      input: 'resume "here"; rm -rf /', timeoutMs: 120000,
    })
  })

  it('lets the envelope trap through as a login failure even though the exit code was 0', async () => {
    const run = answering(envelope('Failed to authenticate', { is_error: true }))
    const err = await rejection(callProvider({ provider: CLAUDE, prompt: 'x', locate: HERE, run }))
    expect(err.kind).toBe('login')
  })

  it('reads a sign-out message off stderr when the CLI exits non-zero', async () => {
    const run = async () => ({ stdout: '', stderr: 'Not logged in. Please run /login', code: 1 })
    const err = await rejection(callProvider({ provider: CLAUDE, prompt: 'x', locate: HERE, run }))
    expect(err.kind).toBe('login')
    expect(err.message).toMatch(/Not logged in/)
  })

  it('reports any other non-zero exit with what stderr said', async () => {
    const run = async () => ({ stdout: '', stderr: 'segmentation fault', code: 139 })
    const err = await rejection(callProvider({ provider: CLAUDE, prompt: 'x', locate: HERE, run }))
    expect(err.kind).toBe('failed')
    expect(err.status).toBe(502)
    expect(err.message).toMatch(/segmentation fault/)
  })

  it('turns a timeout into a failure that says how long it waited', async () => {
    const run = async () => { const e = new Error('slow'); e.code = 'ETIMEDOUT'; throw e }
    const err = await rejection(callProvider({ provider: CLAUDE, prompt: 'x', locate: HERE, run, timeoutMs: 30000 }))
    expect(err.kind).toBe('timeout')
    expect(err.status).toBe(504)
    expect(err.message).toMatch(/did not answer within 30 seconds/)
  })

  // Absent, signed out and timed out each need a different action, so a UI
  // has to be able to tell them apart without parsing prose.
  it('gives every failure kind its own status and sentence', () => {
    const seen = FAILURE_KINDS.map((kind) => new ProviderError(kind, CLAUDE, 'detail'))
    expect(new Set(seen.map((e) => e.message)).size).toBe(FAILURE_KINDS.length)
    expect(seen.every((e) => e.status >= 400 && e.provider === 'claude')).toBe(true)
  })

  it('emits start, send, heartbeats and reply, in that order', async () => {
    const events = []
    const run = async () => {
      await new Promise((r) => setTimeout(r, 40))
      return { stdout: envelope('done'), stderr: '', code: 0 }
    }
    await callProvider({ provider: CLAUDE, prompt: 'abc', locate: HERE, run, emit: (e) => events.push(e), heartbeatMs: 5 })
    expect(events[0]).toEqual({ event: 'start', provider: 'claude', path: '/usr/local/bin/claude' })
    expect(events[1]).toEqual({ event: 'progress', stage: 'send', chars: 3 })
    expect(events.filter((e) => e.stage === 'wait').length).toBeGreaterThan(0)
    expect(events.at(-1)).toMatchObject({ event: 'progress', stage: 'reply', chars: 4 })
    expect(events.every(isEvent)).toBe(true)
  })

  it('stops the heartbeat once the call has failed', async () => {
    const events = []
    const run = async () => { const e = new Error('slow'); e.code = 'ETIMEDOUT'; throw e }
    await rejection(callProvider({ provider: CLAUDE, prompt: 'x', locate: HERE, run, emit: (e) => events.push(e), heartbeatMs: 2 }))
    const count = events.length
    await new Promise((r) => setTimeout(r, 15))
    expect(events.length).toBe(count)
  })
})

describe('createDetector', () => {
  it('reports a present provider with the version it printed', async () => {
    const detect = createDetector({ locate: HERE, run: answering('2.1.245 (Claude Code)\n') })
    expect(await detect()).toEqual([{
      id: 'claude', label: 'Claude Code', install: 'https://claude.ai/code',
      present: true, path: '/usr/local/bin/claude', runs: true, version: '2.1.245 (Claude Code)', error: null,
    }])
  })

  it('reports an absent provider without trying to run it', async () => {
    const run = vi.fn()
    const [claude] = await createDetector({ locate: NOWHERE, run })()
    expect(claude).toMatchObject({ id: 'claude', present: false, path: null, runs: false, version: null, error: null })
    expect(run).not.toHaveBeenCalled()
  })

  it('reports a binary that is there but will not run, with the reason', async () => {
    const run = async () => ({ stdout: '', stderr: 'libnode.so: cannot open shared object file', code: 127 })
    const [claude] = await createDetector({ locate: HERE, run })()
    expect(claude).toMatchObject({ present: true, runs: false, version: null })
    expect(claude.error).toMatch(/installed at \/usr\/local\/bin\/claude but could not run: libnode/)
  })

  it('answers from cache within the ttl and probes again on refresh or expiry', async () => {
    let t = 0
    const run = vi.fn(answering('1.0'))
    const detect = createDetector({ locate: HERE, run, ttlMs: 1000, now: () => t })
    await Promise.all([detect(), detect()])
    await detect()
    expect(run).toHaveBeenCalledTimes(1)
    await detect({ refresh: true })
    expect(run).toHaveBeenCalledTimes(2)
    t = 5000
    await detect()
    expect(run).toHaveBeenCalledTimes(3)
  })

  // A real call costs the user money; a version probe costs nothing.
  it('only ever runs the version probe, never a prompt', async () => {
    const run = vi.fn(answering('1.0'))
    await createDetector({ locate: HERE, run })()
    expect(run.mock.calls.map((c) => c[0].args)).toEqual([['--version']])
  })
})

describe('readNdjson', () => {
  it('separates progress lines from the final body', () => {
    const lines = [
      startEvent({ provider: 'claude', path: '/x' }),
      progressEvent({ stage: 'send', chars: 2 }),
      { skills: ['go'] },
    ]
    expect(readNdjson(lines.map((l) => JSON.stringify(l)).join('\n') + '\n')).toEqual({
      events: [
        { event: 'start', provider: 'claude', path: '/x' },
        { event: 'progress', stage: 'send', chars: 2 },
      ],
      result: { skills: ['go'] },
    })
  })

  it('has no result when the stream broke off on an event', () => {
    expect(readNdjson(JSON.stringify(startEvent({ provider: 'claude', path: '/x' })))).toMatchObject({ result: null })
    expect(readNdjson('')).toEqual({ events: [], result: null })
  })
})

// These spawn node itself, never an AI CLI: they prove the process plumbing
// the providers sit on, which no fake can.
describe('runCli', () => {
  const node = process.execPath

  it('delivers the input over stdin and collects stdout with the exit code', async () => {
    const args = ['-e', 'process.stdin.on("data", (d) => process.stdout.write(String(d).toUpperCase()))']
    expect(await runCli({ file: node, args, input: 'hello', timeoutMs: 20000 })).toEqual({ stdout: 'HELLO', stderr: '', code: 0 })
  })

  it('resolves on a non-zero exit so the caller can read stderr', async () => {
    const out = await runCli({ file: node, args: ['-e', 'console.error("nope"); process.exit(3)'], input: '', timeoutMs: 20000 })
    expect(out.code).toBe(3)
    expect(out.stderr.trim()).toBe('nope')
  })

  it('kills a process that outlives its timeout and rejects with ETIMEDOUT', async () => {
    const err = await rejection(runCli({ file: node, args: ['-e', 'setTimeout(() => {}, 60000)'], input: '', timeoutMs: 200 }))
    expect(err.code).toBe('ETIMEDOUT')
  })

  it('rejects with ENOENT for a file that is not there', async () => {
    const err = await rejection(runCli({ file: '/definitely/not/here', args: [], input: '', timeoutMs: 5000 }))
    expect(err.code).toBe('ENOENT')
  })

  // A child that dies before reading a long resume closes the pipe under the
  // write; the EPIPE must not take the server down with it.
  it('survives a child that exits before reading its input', async () => {
    const out = await runCli({ file: node, args: ['-e', 'process.exit(2)'], input: 'x'.repeat(1 << 20), timeoutMs: 20000 })
    expect(out.code).toBe(2)
  })
})
