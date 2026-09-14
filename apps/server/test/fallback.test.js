import { describe, it, expect, vi } from 'vitest'
import { callWithFallback } from '@jobdekho/server/ai/fallback.js'
import { CLAUDE, AGY } from '@jobdekho/server/ai/providers.js'
import { ProviderError } from '@jobdekho/server/ai/errors.js'

const scratch = (work) => work('/scratch')
const locate = () => '/usr/local/bin/cli'

// What each CLI prints, in its own envelope: Claude Code reports a dead
// login as is_error WITH exit code 0, agy as a result event with status
// ERROR, which is why neither shows up as a failed process.
const claudeSaysExpired = JSON.stringify({ type: 'result', is_error: true, result: 'OAuth session expired' })
const claudeSays = (text) => JSON.stringify({ type: 'result', result: text })
const agySays = (text) => JSON.stringify({ event: 'result', result: { status: 'SUCCESS', response: text } })

// The real chooser's contract: skip the ids already tried, in PROVIDERS order.
const chooser = (...order) => vi.fn(async (policy, { after = [] } = {}) => {
  const left = order.filter((p) => !after.includes(p.id) && p.supports(policy))
  if (!left.length) throw new ProviderError('not_found', order[0])
  return left[0]
})

const runner = (byBinary) => vi.fn(async ({ file, args }) => ({
  stdout: byBinary[args.includes('-p=') ? 'agy' : 'claude'] ?? '', stderr: '', code: 0, file,
}))

describe('callWithFallback', () => {
  it('asks one CLI and stops when it answers', async () => {
    const select = chooser(CLAUDE, AGY)
    const run = runner({ claude: claudeSays('first answer') })
    const out = await callWithFallback({ select, policy: 'none', prompt: 'hi', run, locate, scratch })
    expect(out).toEqual({ provider: CLAUDE, text: 'first answer' })
    expect(run).toHaveBeenCalledTimes(1)
  })

  // The version probe cannot tell a signed-out CLI from a signed-in one, so
  // this is the case the fallback exists for.
  it('moves to the next CLI when the first is signed out', async () => {
    const select = chooser(CLAUDE, AGY)
    const run = runner({ claude: claudeSaysExpired, agy: agySays('second answer') })
    const out = await callWithFallback({ select, policy: 'none', prompt: 'hi', run, locate, scratch })
    expect(out.provider).toBe(AGY)
    expect(out.text).toBe('second answer')
    expect(select.mock.calls[1][1]).toEqual({ after: ['claude'] })
  })

  it('does not spend a second CLI on an answer about the work', async () => {
    const select = chooser(CLAUDE, AGY)
    const run = vi.fn(async () => ({ stdout: '', stderr: 'model overloaded', code: 1 }))
    const err = await callWithFallback({ select, policy: 'none', prompt: 'hi', run, locate, scratch }).catch((e) => e)
    expect(err.kind).toBe('failed')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('reports the first CLI when no other one can answer either', async () => {
    const select = chooser(CLAUDE, AGY)
    const run = runner({ claude: claudeSaysExpired, agy: JSON.stringify({ event: 'result', result: { status: 'ERROR', error: 'Please sign in to view available models' } }) })
    const err = await callWithFallback({ select, policy: 'none', prompt: 'hi', run, locate, scratch }).catch((e) => e)
    expect(err.kind).toBe('login')
    expect(err.provider).toBe('claude')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('keeps the only CLI that honours a policy from being tried twice', async () => {
    const select = chooser(CLAUDE)
    const run = runner({ claude: claudeSaysExpired })
    const err = await callWithFallback({ select, policy: 'web', prompt: 'hi', run, locate, scratch }).catch((e) => e)
    expect(err.kind).toBe('login')
    expect(run).toHaveBeenCalledTimes(1)
  })

  // A chooser that ignores `after` would otherwise hand back the same CLI
  // for ever, so the loop ends on a repeat rather than trusting the caller.
  it('ends on a chooser that keeps handing back the same CLI', async () => {
    const select = vi.fn(async () => CLAUDE)
    const run = runner({ claude: claudeSaysExpired })
    const err = await callWithFallback({ select, policy: 'none', prompt: 'hi', run, locate, scratch }).catch((e) => e)
    expect(err.kind).toBe('login')
    expect(run).toHaveBeenCalledTimes(1)
  })
})
