import { describe, it, expect, vi } from 'vitest'
import { runCli } from '@jobdekho/server/ai/spawn.js'
import { agyAnswered } from '@jobdekho/server/ai/agy-answered.js'
import { callProvider } from '@jobdekho/server/ai/call.js'
import { AGY } from '@jobdekho/server/ai/providers.js'
import { timedOut } from '@jobdekho/server/ai/errors.js'
import { agyReply, AGY_INIT } from './fixtures/agy-stream.js'

const node = process.execPath
const rejection = (promise) => promise.then(() => { throw new Error('resolved') }, (err) => err)
const NL = String.fromCharCode(10)

// These spawn node itself, never an AI CLI: a stand-in that writes the way
// a slow model does, or hangs on after its answer.
describe('runCli held to how long it goes quiet', () => {
  it('lets a run that keeps writing go past the quiet limit, up to the outer one', async () => {
    const script = 'let n = 0; const t = setInterval(() => { process.stdout.write("x"); if (++n === 6) { clearInterval(t) } }, 100)'
    const out = await runCli({ file: node, args: ['-e', script], input: '', timeoutMs: 20000, quietMs: 400 })
    expect(out).toMatchObject({ stdout: 'xxxxxx', code: 0 })
  })

  it('stops a run that goes quiet, and says so', async () => {
    const err = await rejection(runCli({ file: node, args: ['-e', 'process.stdout.write("x"); setTimeout(() => {}, 60000)'], input: '', timeoutMs: 20000, quietMs: 300 }))
    expect(err).toMatchObject({ code: 'ETIMEDOUT', how: 'quiet' })
  })

  it('still stops a run that never ends at the outer limit', async () => {
    const script = 'setInterval(() => process.stdout.write("x"), 50)'
    const err = await rejection(runCli({ file: node, args: ['-e', script], input: '', timeoutMs: 500, quietMs: 300 }))
    expect(err).toMatchObject({ code: 'ETIMEDOUT', how: 'cap' })
  })

  it('ends the run once the answer is whole, though the process hangs on, and counts it clean', async () => {
    const nl = 'String.fromCharCode(10)'
    const script = `process.stdout.write("partial" + ${nl} + "DONE" + ${nl}); setTimeout(() => {}, 60000)`
    const started = Date.now()
    const out = await runCli({ file: node, args: ['-e', script], input: '', timeoutMs: 30000, quietMs: 20000, answered: (text) => text.includes(`DONE${NL}`) })
    expect(out).toMatchObject({ stdout: `partial${NL}DONE${NL}`, code: 0 })
    expect(Date.now() - started).toBeLessThan(15000)
  })
})

describe('agyAnswered', () => {
  it('is true once a whole result line is in, and not before', () => {
    const whole = agyReply('{"ok":true}')
    expect(agyAnswered(whole)).toBe(true)
    expect(agyAnswered(whole.slice(0, -1))).toBe(false)
    expect(agyAnswered(`${AGY_INIT}${NL}`)).toBe(false)
    expect(agyAnswered('')).toBe(false)
  })
})

describe('a timed-out call, in words', () => {
  it('says whether the CLI went quiet partway or ran out of time', () => {
    expect(timedOut(AGY, 180000, 'quiet').message).toMatch(/^Antigravity stopped answering for 3 minutes\. Try again/)
    expect(timedOut(AGY, 540000).message).toMatch(/^Antigravity did not answer within 9 minutes\./)
    expect(timedOut(AGY, 30000).message).toMatch(/^Antigravity did not answer within 30 seconds\./)
  })

  it('reports Antigravity going quiet as that', async () => {
    const run = vi.fn(async () => { throw Object.assign(new Error('quiet'), { code: 'ETIMEDOUT', how: 'quiet' }) })
    const err = await rejection(callProvider({ provider: AGY, prompt: 'x', tools: 'none', locate: () => '/agy', run, scratch: (work) => work('/s'), timeoutMs: 180000 }))
    expect(err.kind).toBe('timeout')
    expect(err.message).toMatch(/stopped answering for 3 minutes/)
  })
})
