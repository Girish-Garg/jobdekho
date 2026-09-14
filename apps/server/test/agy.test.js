import { describe, it, expect, vi, afterAll } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AGY } from '@jobdekho/server/ai/providers.js'
import { unwrapAgy, encodeAgyInput, AGY_ARGS } from '@jobdekho/server/ai/agy.js'
import { agyAllowRules, agyUnusable, agySettingsPath } from '@jobdekho/server/ai/agy-settings.js'
import { callProvider } from '@jobdekho/server/ai/call.js'
import { createDetector } from '@jobdekho/server/ai/detect.js'
import { ProviderError } from '@jobdekho/server/ai/errors.js'
import { agyStream, agyReply, AGY_INIT, AGY_OK, AGY_EMPTY_PROMPT, AGY_SIGNED_OUT, AGY_DENIED } from './fixtures/agy-stream.js'

const HERE = () => 'C:\\Users\\me\\AppData\\Local\\agy\\bin\\agy.exe'
const scratch = (work) => work('/scratch')
const AGY_ONE_SHOT = ['-p=', '--input-format', 'stream-json', '--output-format', 'stream-json', '--disable-slash-commands']

function thrown(fn) {
  try { fn() } catch (err) { return err }
  throw new Error('expected a throw')
}

describe('the Antigravity entry', () => {
  // -p takes a value on this CLI, so the empty value plus stream-json input
  // is what moves the prompt off the command line and onto stdin.
  it('reads the prompt from stdin as stream-json and answers as stream-json, with no prompt on the command line', () => {
    expect(AGY.promptArgs('none')).toEqual(AGY_ONE_SHOT)
    expect(AGY_ARGS.byPolicy).toEqual({ none: [] })
    expect(AGY.versionArgs).toEqual(['--version'])
    expect(AGY.binary).toBe('agy')
    expect(AGY.label).toBe('Antigravity')
    expect(AGY.install).toBe('https://antigravity.google')
  })

  // Headless mode auto-denies every permission-gated tool, and the only way
  // to allow one is a permanent rule in the person's own global settings, so
  // web access is not something a single call can be given.
  it('honours the no-tools policy alone, and asks for no permission to be skipped', () => {
    expect(AGY.policies).toEqual(['none'])
    expect(AGY.supports('web')).toBe(false)
    expect(AGY.promptArgs('web')).toBeNull()
    expect(AGY.promptArgs('none').join(' ')).not.toMatch(/dangerously|yolo|allow|permission/i)
  })

  it('wraps the prompt as one "user" event line holding a single text block', () => {
    const line = encodeAgyInput('Reply with "OK"; rm -rf /')
    expect(line).toBe('{"event":"user","message":{"role":"user","content":[{"type":"text","text":"Reply with \\"OK\\"; rm -rf /"}]}}\n')
    expect(JSON.parse(line)).toEqual({ event: 'user', message: { role: 'user', content: [{ type: 'text', text: 'Reply with "OK"; rm -rf /' }] } })
  })

  // A resume is many lines; the CLI reads one turn per line.
  it('keeps a multi-line prompt on one line, ended by exactly one newline', () => {
    const line = encodeAgyInput('line one\nline two\r\nline three')
    expect(line.endsWith('\n')).toBe(true)
    expect(line.slice(0, -1)).not.toContain('\n')
    expect(JSON.parse(line).message.content[0].text).toBe('line one\nline two\r\nline three')
  })
})

describe('unwrapAgy', () => {
  it('reads the reply out of the result event at the end of the stream', () => {
    expect(unwrapAgy(agyStream(AGY_OK), AGY)).toBe('OK\n')
    expect(unwrapAgy(agyReply('{"letter":"Dear Hiring Team"}'), AGY)).toBe('{"letter":"Dear Hiring Team"}')
  })

  it('reads a bare result object too, as --output-format json prints it', () => {
    expect(unwrapAgy(JSON.stringify(AGY_OK), AGY)).toBe('OK\n')
    expect(unwrapAgy(JSON.stringify(AGY_OK, null, 2), AGY)).toBe('OK\n')
  })

  it('takes the last result should more than one be printed', () => {
    const two = agyStream({ ...AGY_OK, response: 'first' }) + JSON.stringify({ event: 'result', result: { ...AGY_OK, response: 'second' } }) + '\n'
    expect(unwrapAgy(two, AGY)).toBe('second')
  })

  // Status ERROR arrives under exit code 0, so the result has to be read or
  // the sign-in sentence is lost.
  it('turns an ERROR result that asks to sign in into a login failure', () => {
    const err = thrown(() => unwrapAgy(agyStream(AGY_SIGNED_OUT), AGY))
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.kind).toBe('login')
    expect(err.status).toBe(503)
    expect(err.provider).toBe('agy')
    expect(err.message).toMatch(/^Antigravity is not signed in \(Please sign in to view available models/)
    expect(err.message).toMatch(/run "agy", finish signing in/)
  })

  it('reports any other ERROR result as failed, with its error string', () => {
    const err = thrown(() => unwrapAgy(agyStream(AGY_EMPTY_PROMPT), AGY))
    expect(err.kind).toBe('failed')
    expect(err.status).toBe(502)
    expect(err.message).toMatch(/Antigravity could not finish: Error: empty prompt/)
  })

  // The run reports SUCCESS with nothing said; the denied list is the only
  // sign the model reached for a tool. Under the no-tools policy nothing in
  // a JobDekho prompt should get there, so it is a failure worth naming.
  it('reports an empty reply with a denied tool as a failure that names the tool', () => {
    const err = thrown(() => unwrapAgy(agyStream(AGY_DENIED), AGY))
    expect(err.kind).toBe('failed')
    expect(err.message).toMatch(/answered nothing after asking for ReadUrlContent, which headless mode denies/)
  })

  it('names the action when a denied entry has no display name', () => {
    const denied = { ...AGY_DENIED, denied_actions: [{ action: 'read_file' }, { action: 'run_command', display_name: 'RunCommand' }] }
    expect(thrown(() => unwrapAgy(agyStream(denied), AGY)).message).toMatch(/asking for read_file, RunCommand/)
  })

  it('lets a reply through even when a tool was denied along the way', () => {
    const answered = { ...AGY_DENIED, response: 'Could not open the site, but the posting reads as genuine.' }
    expect(unwrapAgy(agyStream(answered), AGY)).toMatch(/reads as genuine/)
  })

  // As unwrapClaude treats a bare reply, so a non-zero exit still gets its
  // stderr read in call.js.
  it('hands output with no result in it back as it is', () => {
    expect(unwrapAgy('', AGY)).toBe('')
    expect(unwrapAgy('plain text', AGY)).toBe('plain text')
    expect(unwrapAgy(AGY_INIT + '\n', AGY)).toBe(AGY_INIT + '\n')
  })
})

describe('callProvider with Antigravity', () => {
  it('runs agy with the fixed arguments and the prompt wrapped on stdin, and returns the text', async () => {
    const run = vi.fn(async () => ({ stdout: agyReply('{"skills":["go"]}'), stderr: '', code: 0 }))
    const out = await callProvider({ provider: AGY, prompt: 'RESUME:\nJane "Doe"', tools: 'none', locate: HERE, run, scratch })
    expect(out).toEqual({ provider: 'agy', text: '{"skills":["go"]}' })
    expect(run).toHaveBeenCalledWith({
      file: HERE(),
      args: AGY_ONE_SHOT,
      input: '{"event":"user","message":{"role":"user","content":[{"type":"text","text":"RESUME:\\nJane \\"Doe\\""}]}}\n',
      timeoutMs: 120000,
      cwd: '/scratch',
    })
  })

  it('reads a sign-in failure off the result even though agy exited 0', async () => {
    const run = async () => ({ stdout: agyStream(AGY_SIGNED_OUT), stderr: '', code: 0 })
    const err = await callProvider({ provider: AGY, prompt: 'x', tools: 'none', locate: HERE, run, scratch }).catch((e) => e)
    expect(err.kind).toBe('login')
  })

  // Print mode with no session at all logs "not authenticated" and exits
  // non-zero, the other route a sign-out takes.
  it('reads "not authenticated" off stderr on a non-zero exit', async () => {
    const run = async () => ({ stdout: '', stderr: 'error: not authenticated\n', code: 1 })
    const err = await callProvider({ provider: AGY, prompt: 'x', tools: 'none', locate: HERE, run, scratch }).catch((e) => e)
    expect(err.kind).toBe('login')
    expect(err.message).toMatch(/not authenticated/)
  })

  it('refuses before spawning anything when agy is absent', async () => {
    const run = vi.fn()
    const err = await callProvider({ provider: AGY, prompt: 'x', tools: 'none', locate: () => null, run }).catch((e) => e)
    expect(err.kind).toBe('not_found')
    expect(err.message).toMatch(/Antigravity is not installed.*antigravity\.google/)
    expect(run).not.toHaveBeenCalled()
  })
})

describe('the settings gate', () => {
  const homes = []
  const homeWith = (settings) => {
    const home = mkdtempSync(join(tmpdir(), 'jobdekho-home-'))
    homes.push(home)
    if (settings !== undefined) {
      mkdirSync(join(home, '.gemini', 'antigravity-cli'), { recursive: true })
      writeFileSync(agySettingsPath(home), typeof settings === 'string' ? settings : JSON.stringify(settings))
    }
    return home
  }
  afterAll(() => homes.forEach((home) => rmSync(home, { recursive: true, force: true })))

  it('looks where agy keeps its global settings', () => {
    expect(agySettingsPath('/home/me')).toBe(join('/home/me', '.gemini', 'antigravity-cli', 'settings.json'))
  })

  it('reads nothing pre-approved out of a missing file, one without permissions, or an empty allow list', () => {
    expect(agyUnusable({ home: homeWith(undefined) })).toBeNull()
    expect(agyUnusable({ home: homeWith({ colorScheme: 'dark', trustedWorkspaces: ['C:\\Coding'] }) })).toBeNull()
    expect(agyUnusable({ home: homeWith({ permissions: {} }) })).toBeNull()
    expect(agyUnusable({ home: homeWith({ permissions: { allow: [] } }) })).toBeNull()
    expect(agyUnusable({ home: homeWith('{ not json') })).toBeNull()
  })

  it('refuses an install whose settings pre-approve a gated family, naming the rules and the file', () => {
    const home = homeWith({ permissions: { allow: ['read_file(*)'] } })
    const why = agyUnusable({ home })
    expect(why).toMatch(/^Antigravity is installed, but /)
    expect(why).toContain(agySettingsPath(home))
    expect(why).toMatch(/\(read_file\(\*\) under permissions\.allow\)/)
    expect(why).toMatch(/will not hand it your resume\. Remove those rules to use it here\.$/)
  })

  it('counts every gated family and nothing else', () => {
    const allow = ['command(git *)', ' url(https://example.com) ', 'browser(*)', 'mcp(github)', 'read_file(C:/x)', 'theme(dark)', '']
    expect(agyAllowRules({ permissions: { allow } }))
      .toEqual(['command(git *)', 'url(https://example.com)', 'browser(*)', 'mcp(github)', 'read_file(C:/x)'])
    expect(agyAllowRules({ permissions: { allow: ['theme(dark)'] } })).toEqual([])
    expect(agyAllowRules(null)).toEqual([])
  })

  // A rule in a shape the CLI does not document cannot be read for its
  // reach, and the promise is not worth guessing about.
  it('treats a rule it cannot read as a grant', () => {
    expect(agyAllowRules({ permissions: { allow: [{ tool: 'read_file' }] } })).toEqual(['{"tool":"read_file"}'])
    expect(agyAllowRules({ permissions: { allow: 'read_file(*)' } })).toEqual(['read_file(*)'])
  })

  it('makes detection report agy present but not usable, without probing it', async () => {
    const run = vi.fn(async () => ({ stdout: '1.1.22\n', stderr: '', code: 0 }))
    const home = homeWith({ permissions: { allow: ['read_file(*)'] } })
    const [agy] = await createDetector({ locate: HERE, run, providers: [AGY], home })()
    expect(agy).toMatchObject({ id: 'agy', present: true, path: HERE(), runs: false, version: null, policies: ['none'] })
    expect(agy.error).toMatch(/read_file\(\*\)/)
    expect(run).not.toHaveBeenCalled()
  })

  it('lets a clean install through with its version', async () => {
    const run = vi.fn(async () => ({ stdout: '1.1.22\n', stderr: '', code: 0 }))
    const [agy] = await createDetector({ locate: HERE, run, providers: [AGY], home: homeWith(undefined) })()
    expect(agy).toMatchObject({ present: true, runs: true, version: '1.1.22', error: null })
  })
})
