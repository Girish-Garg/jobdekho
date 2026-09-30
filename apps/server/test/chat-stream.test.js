import { describe, it, expect, vi } from 'vitest'
import { partialReply } from '@jobdekho/server/ai/partial-reply.js'
import { textFeed } from '@jobdekho/server/ai/text-feed.js'
import { claudeText, claudeStreamArgs, unwrapClaude } from '@jobdekho/server/ai/claude.js'
import { agyText } from '@jobdekho/server/ai/agy.js'
import { CLAUDE, AGY } from '@jobdekho/server/ai/providers.js'
import { callProvider } from '@jobdekho/server/ai/call.js'
import { runCli } from '@jobdekho/server/ai/spawn.js'
import { replyStream } from '@jobdekho/server/chat/reply-stream.js'
import { AGY_STEPS } from './fixtures/agy-stream.js'

const BS = '\\'
const HERE = () => '/usr/local/bin/claude'

// A text delta as Claude Code 2.1.281 prints it with --include-partial-messages.
const claudeDelta = (text) => JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } }, session_id: 'x' })
const claudeResult = (result) => JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result, session_id: 'x' })

describe('partialReply', () => {
  it('is empty until the reply key has been written, then grows with the string', () => {
    expect(partialReply('')).toBe('')
    expect(partialReply('{"refs":[],"rep')).toBe('')
    expect(partialReply('{"reply":"Three stand')).toBe('Three stand')
    expect(partialReply('{"reply" : "Three stand out", "refs":[]}')).toBe('Three stand out')
  })

  it('decodes escapes once they are whole, and waits on one cut in half', () => {
    expect(partialReply(`{"reply":"a${BS}nb ${BS}"q${BS}" ${BS}${BS}"}`)).toBe('a\nb "q" \\')
    expect(partialReply(`{"reply":"caf${BS}u00e9 ok"}`)).toBe('café ok')
    expect(partialReply(`{"reply":"caf${BS}u00`)).toBe('caf')
    expect(partialReply(`{"reply":"end${BS}`)).toBe('end')
  })
})

describe('reading a CLI as it writes', () => {
  it('reads Claude Code text deltas and nothing else', () => {
    expect(claudeText(claudeDelta('{"reply":"Hi'))).toBe('{"reply":"Hi')
    expect(claudeText(JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'hmm' } } }))).toBe('')
    expect(claudeText(claudeResult('{"reply":"x"}'))).toBe('')
    expect(claudeText('not json text_delta')).toBe('')
  })

  it('reads Antigravity agent_response deltas', () => {
    expect(AGY_STEPS.map(agyText).join('')).toBe('OK\n')
  })

  it('asks Claude Code for the stream in place of the one envelope', () => {
    const args = claudeStreamArgs(CLAUDE.promptArgs('none'))
    expect(args.slice(0, 3)).toEqual(['-p', '--output-format', 'stream-json'])
    expect(args).toEqual(expect.arrayContaining(['--verbose', '--include-partial-messages', '--tools', '']))
    expect(AGY.streamArgs(AGY.promptArgs('none'))).toEqual(AGY.promptArgs('none'))
  })

  it('unwraps the result a stream ends on, and its failure', () => {
    const stream = [JSON.stringify({ type: 'system', subtype: 'init' }), claudeDelta('{"reply":"OK"}'), claudeResult('{"reply":"OK"}')].join('\n')
    expect(unwrapClaude(stream, CLAUDE)).toBe('{"reply":"OK"}')
    const failed = JSON.stringify({ type: 'result', is_error: true, result: 'OAuth session expired' })
    expect(() => unwrapClaude(failed, CLAUDE)).toThrow(/not signed in/)
  })

  it('reads a line only once it is whole, across chunks', () => {
    const seen = []
    const feed = textFeed(claudeText, (text) => seen.push(text))
    const line = `${claudeDelta('{"reply":"Hel')}\n${claudeDelta('lo"}')}\n`
    feed(line.slice(0, 40))
    expect(seen).toEqual([])
    feed(line.slice(40))
    expect(seen.at(-1)).toBe('{"reply":"Hello"}')
  })

  it('hands the text so far to onText, with the stream arguments, and the reply at the end', async () => {
    const stdout = [claudeDelta('{"reply":"Two'), claudeDelta(' are remote"}'), claudeResult('{"reply":"Two are remote"}')].join('\n') + '\n'
    const run = vi.fn(async ({ onStdout }) => {
      onStdout(stdout)
      return { stdout, stderr: '', code: 0 }
    })
    const texts = []
    const out = await callProvider({ provider: CLAUDE, prompt: 'q', tools: 'none', locate: HERE, run, scratch: (work) => work('/s'), onText: (t) => texts.push(t) })
    expect(out.text).toBe('{"reply":"Two are remote"}')
    expect(texts.at(-1)).toBe('{"reply":"Two are remote"}')
    expect(run.mock.calls[0][0].args).toEqual(claudeStreamArgs(CLAUDE.promptArgs('none')))
  })
})

describe('replyStream', () => {
  it('sends what was added, at most once per interval, and the rest on flush', () => {
    let t = 0
    const events = []
    const onText = replyStream((e) => events.push(e), { everyMs: 100, now: () => t })
    onText('{"reply":"Two')
    t = 50
    onText('{"reply":"Two are')
    t = 120
    onText('{"reply":"Two are remote')
    onText('{"reply":"Two are remote."}')
    onText.flush()
    expect(events).toEqual([
      { event: 'text', add: 'Two' },
      { event: 'text', add: ' are remote' },
      { event: 'text', add: '.' },
    ])
  })

  it('sends the whole text when it no longer continues what was sent', () => {
    const events = []
    const onText = replyStream((e) => events.push(e), { everyMs: 0 })
    onText('{"reply":"First try')
    onText('{"reply":"Another')
    expect(events).toEqual([{ event: 'text', add: 'First try' }, { event: 'text', text: 'Another' }])
  })
})

describe('runCli', () => {
  const node = process.execPath

  it('passes the output on as it arrives', async () => {
    const chunks = []
    const out = await runCli({ file: node, args: ['-e', 'process.stdout.write("a\\n");setTimeout(()=>process.stdout.write("b\\n"),50)'], input: '', timeoutMs: 10000, cwd: process.cwd(), onStdout: (c) => chunks.push(c) })
    expect(out.code).toBe(0)
    expect(chunks.join('')).toBe('a\nb\n')
  })

  it('ends the process when stopped, and says it was stopped', async () => {
    const control = new AbortController()
    const started = Date.now()
    const running = runCli({ file: node, args: ['-e', 'setTimeout(()=>{},20000)'], input: '', timeoutMs: 30000, cwd: process.cwd(), signal: control.signal })
    setTimeout(() => control.abort(), 100)
    await expect(running).rejects.toMatchObject({ code: 'EABORTED' })
    expect(Date.now() - started).toBeLessThan(5000)
  })

  it('refuses to start once already stopped', async () => {
    const control = new AbortController()
    control.abort()
    await expect(runCli({ file: node, args: ['-e', ''], input: '', timeoutMs: 1000, cwd: process.cwd(), signal: control.signal })).rejects.toMatchObject({ code: 'EABORTED' })
  })
})
