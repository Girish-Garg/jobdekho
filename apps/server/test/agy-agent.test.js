import { describe, it, expect, vi } from 'vitest'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { AGY, CLAUDE } from '@jobdekho/server/ai/providers.js'
import { AGENT_LOG, agentArgs, agentFiles, checkAgentRun } from '@jobdekho/server/ai/agy-agent.js'
import { runStaged } from '@jobdekho/server/ai/staged-run.js'
import { inEmptyDir } from '@jobdekho/server/ai/scratch-dir.js'
import { callProvider } from '@jobdekho/server/ai/call.js'
import { callWithFallback } from '@jobdekho/server/ai/fallback.js'
import { ProviderError } from '@jobdekho/server/ai/errors.js'
import { agyReply, agyReplyAfter, agyRan, AGY_LOG_AGENT, AGY_LOG_FELL_BACK } from './fixtures/agy-stream.js'

const HERE = () => 'C:\\Users\\me\\AppData\\Local\\agy\\bin\\agy.exe'
const scratch = (work) => work('/scratch')

function thrown(fn) {
  try { fn() } catch (err) { return err }
  throw new Error('expected a throw')
}

// The frontmatter is the whole contract with agy: the name --agent asks for,
// and the tool list that is everything the model is offered.
describe('the per-call agent', () => {
  it('offers no tool at all under none, and search alone under web', () => {
    expect(agentFiles('none')).toEqual({
      '.agents/agents/jobdekho-none.md': expect.stringMatching(/^---\nname: jobdekho-none\n[^]*\ntools: \[\]\n---\n/),
    })
    const web = agentFiles('web')['.agents/agents/jobdekho-web.md']
    expect(web).toMatch(/^---\nname: jobdekho-web\n[^]*\ntools:\n {2}- search_web\n---\n/)
    expect(web).not.toMatch(/read_url|browser|command|file/)
  })

  it('asks for the agent it wrote, and for the log to land in the call directory', () => {
    expect(agentArgs('none')).toEqual(['--agent', 'jobdekho-none', '--log-file', AGENT_LOG])
    expect(AGY.promptArgs('web').slice(-4)).toEqual(['--agent', 'jobdekho-web', '--log-file', AGENT_LOG])
    expect(AGY.stage).toBe(agentFiles)
    expect(AGY.collect).toEqual([AGENT_LOG])
  })
})

describe('checkAgentRun', () => {
  const run = (stdout, log, tools = 'none') => ({ stdout, collected: agyRan(log), tools })

  it('keeps an answer when the log shows the agent ran and no tool was called', () => {
    expect(() => checkAgentRun(run(agyReply('ok'), AGY_LOG_AGENT), AGY)).not.toThrow()
  })

  it('keeps a search under web', () => {
    expect(() => checkAgentRun(run(agyReplyAfter(['search_web'], 'ok'), AGY_LOG_AGENT, 'web'), AGY)).not.toThrow()
  })

  // agy runs its default agent, every tool included, when the file is not
  // found, and says so only in the log.
  it('throws the answer away when agy fell back to its default agent', () => {
    const err = thrown(() => checkAgentRun(run(agyReply('ok'), AGY_LOG_FELL_BACK), AGY))
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.kind).toBe('unconfirmed')
    expect(err.message).toMatch(/Antigravity answered, but JobDekho could not confirm it kept to the tools this call allows/)
  })

  // A later agy that rewords its log, or writes none, fails closed.
  it('throws the answer away when the log is missing or says nothing about the agent', () => {
    expect(thrown(() => checkAgentRun(run(agyReply('ok'), ''), AGY)).kind).toBe('unconfirmed')
    expect(thrown(() => checkAgentRun({ stdout: agyReply('ok'), tools: 'none' }, AGY)).kind).toBe('unconfirmed')
  })

  it('throws the answer away when a tool outside the policy was called, whatever the log says', () => {
    const none = thrown(() => checkAgentRun(run(agyReplyAfter(['search_web'], 'ok'), AGY_LOG_AGENT), AGY))
    expect(none.message).toMatch(/it used search_web, which this call does not allow/)
    const web = thrown(() => checkAgentRun(run(agyReplyAfter(['search_web', 'read_url_content'], 'ok'), AGY_LOG_AGENT, 'web'), AGY))
    expect(web.message).toMatch(/it used read_url_content, which/)
  })
})

describe('runStaged', () => {
  it('writes the files into the call directory before the CLI starts, and reads the log back before it goes', async () => {
    let seen = null
    const spawnCli = vi.fn(async ({ cwd }) => {
      seen = readFileSync(join(cwd, '.agents/agents/jobdekho-web.md'), 'utf8')
      writeFileSync(join(cwd, AGENT_LOG), AGY_LOG_AGENT)
      return { stdout: 'out', stderr: '', code: 0 }
    })
    let dir = null
    const result = await inEmptyDir(async (cwd) => {
      dir = cwd
      return runStaged({ file: 'agy', args: [], input: 'x', timeoutMs: 1000, cwd, files: agentFiles('web'), collect: [AGENT_LOG] }, spawnCli)
    })
    expect(seen).toMatch(/name: jobdekho-web/)
    expect(spawnCli).toHaveBeenCalledWith({ file: 'agy', args: [], input: 'x', timeoutMs: 1000, cwd: dir })
    expect(result).toEqual({ stdout: 'out', stderr: '', code: 0, collected: { [AGENT_LOG]: AGY_LOG_AGENT } })
    expect(existsSync(dir)).toBe(false)
  })

  it('runs a CLI that needs neither exactly as before', async () => {
    const spawnCli = vi.fn(async () => ({ stdout: 'out', stderr: '', code: 0 }))
    const out = await runStaged({ file: 'claude', args: ['-p'], input: 'x', timeoutMs: 1000, cwd: '/nowhere' }, spawnCli)
    expect(out).toEqual({ stdout: 'out', stderr: '', code: 0 })
    expect(spawnCli).toHaveBeenCalledWith({ file: 'claude', args: ['-p'], input: 'x', timeoutMs: 1000, cwd: '/nowhere' })
  })
})

// The same check, reached the way every feature reaches it.
describe('an Antigravity call end to end', () => {
  it('hands the run the agent files and returns the answer the log vouches for', async () => {
    const run = vi.fn(async () => ({ stdout: agyReply('{"ok":true}'), stderr: '', code: 0, collected: agyRan() }))
    const out = await callProvider({ provider: AGY, prompt: 'x', tools: 'web', locate: HERE, run, scratch })
    expect(out).toEqual({ provider: 'agy', text: '{"ok":true}' })
    expect(run.mock.calls[0][0]).toMatchObject({ cwd: '/scratch', files: agentFiles('web'), collect: [AGENT_LOG] })
  })

  it('does not return an answer the log cannot vouch for', async () => {
    const run = async () => ({ stdout: agyReply('{"ok":true}'), stderr: '', code: 0, collected: agyRan(AGY_LOG_FELL_BACK) })
    const err = await callProvider({ provider: AGY, prompt: 'x', tools: 'none', locate: HERE, run, scratch }).catch((e) => e)
    expect(err).toMatchObject({ kind: 'unconfirmed', provider: 'agy', status: 502 })
  })

  // Claude Code has nothing to stage, so its run call is what it always was.
  // Claude Code's one extra is a variable, its auto memory off (see claude.js).
  it('stages nothing for Claude Code', async () => {
    const run = vi.fn(async () => ({ stdout: JSON.stringify({ type: 'result', result: 'ok' }), stderr: '', code: 0 }))
    await callProvider({ provider: CLAUDE, prompt: 'x', tools: 'web', locate: HERE, run, scratch })
    expect(Object.keys(run.mock.calls[0][0]).sort()).toEqual(['args', 'cwd', 'env', 'file', 'input', 'timeoutMs'])
  })

  it('asks the other CLI when Antigravity answered in a way it could not vouch for', async () => {
    const run = vi.fn(async ({ file }) => (file.includes('agy')
      ? { stdout: agyReply('from agy'), stderr: '', code: 0, collected: agyRan('') }
      : { stdout: JSON.stringify({ type: 'result', result: 'from claude' }), stderr: '', code: 0 }))
    const order = [AGY, CLAUDE]
    const select = async (_policy, { after }) => order.find((p) => !after.includes(p.id))
    const locate = (name) => (name === 'agy' ? HERE() : '/usr/local/bin/claude')
    const out = await callWithFallback({ select, policy: 'none', prompt: 'x', run, locate, scratch })
    expect(out.provider).toBe(CLAUDE)
    expect(out.text).toBe('from claude')
  })
})
