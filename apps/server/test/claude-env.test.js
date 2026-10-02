import { describe, it, expect, vi } from 'vitest'
import { CLAUDE, AGY, OLLAMA } from '@jobdekho/server/ai/providers.js'
import { underPolicies } from '@jobdekho/server/ai/policies.js'
import { callProvider } from '@jobdekho/server/ai/call.js'
import { runCli } from '@jobdekho/server/ai/spawn.js'

const HERE = () => '/usr/local/bin/claude'
const answering = async () => ({ stdout: JSON.stringify({ type: 'result', result: 'ok' }), stderr: '', code: 0 })
const scratch = (work) => work('/scratch')

// Claude Code's auto memory, its notes from the person's own coding
// sessions, must never reach a job chat (see claude.js).
describe('the environment a CLI runs in', () => {
  it('turns Claude Code\'s auto memory off, and sets nothing for the others', () => {
    expect(CLAUDE.env).toEqual({ CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' })
    expect(AGY.env).toBeUndefined()
    expect(OLLAMA.env).toBeUndefined()
    expect(underPolicies({ base: ['-p'], byPolicy: { none: [] } })).not.toHaveProperty('env')
  })

  it('goes with every Claude Code call, whatever the tool policy', async () => {
    for (const tools of ['none', 'web']) {
      const run = vi.fn(answering)
      await callProvider({ provider: CLAUDE, prompt: 'x', tools, locate: HERE, run, scratch })
      expect(run.mock.calls[0][0].env).toEqual({ CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' })
    }
  })

  it('leaves a CLI with no variables of its own on the server\'s environment alone', async () => {
    const run = vi.fn(answering)
    await callProvider({ provider: { ...CLAUDE, env: undefined }, prompt: 'x', tools: 'none', locate: HERE, run, scratch })
    expect(run.mock.calls[0][0]).not.toHaveProperty('env')
  })

  // These spawn node itself, never an AI CLI.
  it('adds the variables to the server\'s own for the one process', async () => {
    const script = 'process.stdout.write(JSON.stringify({ memory: process.env.CLAUDE_CODE_DISABLE_AUTO_MEMORY ?? null, path: Boolean(process.env.PATH || process.env.Path) }))'
    const run = (env) => runCli({ file: process.execPath, args: ['-e', script], input: '', timeoutMs: 20000, env })
    expect(JSON.parse((await run({ CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' })).stdout)).toEqual({ memory: '1', path: true })
    expect(JSON.parse((await run(null)).stdout).path).toBe(true)
  })
})
