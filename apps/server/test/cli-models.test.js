import { describe, it, expect, vi } from 'vitest'
import { CLAUDE, AGY, OLLAMA } from '@jobdekho/server/ai/providers.js'
import { CLAUDE_MODELS, DEFAULT_MODEL, modelFlag } from '@jobdekho/server/ai/cli-models.js'
import { parseAgyModels, listAgyModels } from '@jobdekho/server/ai/agy-models.js'
import { callProvider } from '@jobdekho/server/ai/call.js'
import { createDetector } from '@jobdekho/server/ai/detect.js'
import { createSelector } from '@jobdekho/server/ai/select.js'
import { withModel } from '@jobdekho/server/ai/model-choice.js'
import { createModelLists } from '@jobdekho/server/ai/model-lists.js'
import { AGY_MODELS_STDOUT, AGY_MODELS_STDERR } from './fixtures/agy-models.js'
import { agyReply, agyRan, AGY_SIGNED_OUT } from './fixtures/agy-stream.js'

// A model choice for Claude Code and Antigravity: the lists they offer, the
// flag a bound model adds, and the detection rows that carry the lists.
// Every CLI here is a fake `run`; nothing is spawned.
const NO_HOME = '/no/such/home'
const scratch = (work) => work('/scratch')
const claudeOk = vi.fn(async () => ({ stdout: JSON.stringify({ type: 'result', result: 'ok' }), stderr: '', code: 0 }))
const argsOf = (run) => run.mock.calls[0][0].args

const row = (provider, over = {}) => ({
  id: provider.id, label: provider.label, install: provider.install, policies: provider.policies,
  present: true, path: `/bin/${provider.binary}`, runs: true, version: '1.0', error: null, models: [], ...over,
})

describe('Claude Code\'s models', () => {
  // `claude --help` names fable, opus and sonnet; its docs add haiku. There
  // is no listing without a model call, so the list is fixed.
  it('offers Default first, then the aliases its docs name', () => {
    expect(CLAUDE_MODELS.map((m) => m.id)).toEqual(['default', 'fable', 'opus', 'sonnet', 'haiku'])
    expect(CLAUDE_MODELS[0]).toBe(DEFAULT_MODEL)
    expect(CLAUDE.listModels()).toBe(CLAUDE_MODELS)
  })

  it('names a picked model with --model, and Default with nothing at all', () => {
    expect(modelFlag({ id: 'opus', label: 'Opus' })).toEqual(['--model', 'opus'])
    expect(modelFlag(DEFAULT_MODEL)).toEqual([])
    expect(modelFlag(undefined)).toEqual([])
  })

  it('puts --model after the one-shot and policy arguments when a model is bound', async () => {
    const run = vi.fn(claudeOk)
    await callProvider({ provider: { ...CLAUDE, model: { id: 'sonnet', label: 'Sonnet' } }, prompt: 'hi', tools: 'web', run, locate: () => '/bin/claude', scratch })
    expect(argsOf(run)).toEqual([...CLAUDE.promptArgs('web'), '--model', 'sonnet'])
  })

  it('runs exactly as before with Default bound, or nothing bound', async () => {
    for (const provider of [{ ...CLAUDE, model: DEFAULT_MODEL }, CLAUDE]) {
      const run = vi.fn(claudeOk)
      await callProvider({ provider, prompt: 'hi', tools: 'none', run, locate: () => '/bin/claude', scratch })
      expect(argsOf(run)).toEqual(CLAUDE.promptArgs('none'))
    }
  })
})

describe('Antigravity\'s models', () => {
  it('reads `agy models` as id and name per line, after Default', () => {
    const models = parseAgyModels(AGY_MODELS_STDOUT)
    expect(models).toHaveLength(14)
    expect(models[0]).toEqual({ id: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)' })
    expect(models.at(-1)).toEqual({ id: 'gpt-oss-120b-medium', label: 'GPT-OSS 120B (Medium)' })
    expect(parseAgyModels(AGY_MODELS_STDOUT.replaceAll('\n', '\r\n'))).toEqual(models)
  })

  // The id goes on a command line, so a line that could smuggle anything
  // else onto it is not a model.
  it('keeps only ids of plain characters, each once, and never one called default', () => {
    const text = [
      'Fetching available models...',
      'Please sign in to view available models. Launch the CLI without arguments to sign in.',
      'good-1.5\tGood',
      'good-1.5\tGood again',
      'bad id\tSpace',
      'bad"id\tQuote',
      'bad&calc\tAmpersand',
      '-flag\tLeading dash',
      'default\tNot the real default',
      'models/gemini-x\tWith a path',
      'no-label\t',
    ].join('\n')
    expect(parseAgyModels(text)).toEqual([{ id: 'good-1.5', label: 'Good' }, { id: 'models/gemini-x', label: 'With a path' }])
    expect(parseAgyModels(undefined)).toEqual([])
  })

  it('lists them by running `agy models`, with Default first', async () => {
    const run = vi.fn(async () => ({ stdout: AGY_MODELS_STDOUT, stderr: AGY_MODELS_STDERR, code: 0 }))
    const models = await listAgyModels({ run, path: '/bin/agy' })
    expect(models[0]).toBe(DEFAULT_MODEL)
    expect(models).toHaveLength(15)
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ file: '/bin/agy', args: ['models'], input: '' }))
  })

  // Signed out, failing or not started at all: it still offers Default, which
  // is how every call ran before.
  it('offers Default alone when the listing finds nothing, fails, or is not asked', async () => {
    const signedOut = vi.fn(async () => ({ stdout: `${AGY_SIGNED_OUT.error}\n`, stderr: '', code: 0 }))
    expect(await listAgyModels({ run: signedOut, path: '/bin/agy' })).toEqual([DEFAULT_MODEL])
    expect(await listAgyModels({ run: async () => ({ stdout: AGY_MODELS_STDOUT, stderr: '', code: 1 }), path: '/bin/agy' })).toEqual([DEFAULT_MODEL])
    expect(await listAgyModels({ run: async () => { throw new Error('timed out') }, path: '/bin/agy' })).toEqual([DEFAULT_MODEL])
    expect(await listAgyModels({ run: null, path: '/bin/agy' })).toEqual([DEFAULT_MODEL])
  })

  // Measured live on 1.2.14 (gemini-3.8-flash-low): the log still says the
  // agent ran, so the answer is kept.
  it('adds --model beside the agent and log arguments, and the agent check still passes', async () => {
    const run = vi.fn(async () => ({ stdout: agyReply('ok'), stderr: '', code: 0, collected: agyRan() }))
    const provider = { ...AGY, model: { id: 'gemini-3.8-flash-low', label: 'Gemini 3.8 Flash (Low)' } }
    const out = await callProvider({ provider, prompt: 'hi', tools: 'none', run, locate: () => '/bin/agy', scratch })
    expect(out.text).toBe('ok')
    expect(argsOf(run)).toEqual([...AGY.promptArgs('none'), '--model', 'gemini-3.8-flash-low'])
    expect(argsOf(run)).toEqual(expect.arrayContaining(['--agent', 'jobdekho-none', '--log-file', 'jobdekho-agy.log']))
  })
})

describe('detection rows\' models', () => {
  const versions = vi.fn(async () => ({ stdout: '1.2.14\n', stderr: '', code: 0 }))

  it('lists Claude Code\'s fixed list and Antigravity\'s own, beside the version probe', async () => {
    const listRun = vi.fn(async () => ({ stdout: AGY_MODELS_STDOUT, stderr: AGY_MODELS_STDERR, code: 0 }))
    const [claude, agy] = await createDetector({ locate: (n) => `/bin/${n}`, run: versions, listRun, home: NO_HOME, providers: [CLAUDE, AGY] })()
    expect(claude.models).toEqual(CLAUDE_MODELS)
    expect(agy.models.map((m) => m.id)).toEqual(['default', ...parseAgyModels(AGY_MODELS_STDOUT).map((m) => m.id)])
    expect(listRun).toHaveBeenCalledTimes(1)
    expect(versions.mock.calls.every(([c]) => c.args[0] === '--version')).toBe(true)
  })

  // A test that fakes `run` alone never has a listing read as a prompt.
  it('starts no listing for a detector whose process seam alone is faked', async () => {
    const run = vi.fn(versions)
    const [, agy] = await createDetector({ locate: (n) => `/bin/${n}`, run, home: NO_HOME, providers: [CLAUDE, AGY] })()
    expect(agy.models).toEqual([DEFAULT_MODEL])
    expect(run.mock.calls.map(([c]) => c.args[0])).toEqual(['--version', '--version'])
  })

  it('lists no models for one that is absent, will not run, or is not running', async () => {
    const [claude] = await createDetector({ locate: () => null, run: versions, providers: [CLAUDE] })()
    expect(claude.models).toEqual([])
    const broken = async () => ({ stdout: '', stderr: 'cannot start', code: 1 })
    const [agy] = await createDetector({ locate: () => '/bin/agy', run: broken, listRun: vi.fn(), home: NO_HOME, providers: [AGY] })()
    expect(agy).toMatchObject({ runs: false, models: [] })
    const [ollama] = await createDetector({ locate: () => '/bin/ollama', run: versions, providers: [OLLAMA] })()
    expect(ollama).toMatchObject({ runs: false, models: [], policies: ['none'] })
  })
})

// Measured: `agy models` about six seconds, `agy --version` 0.15. A list
// is read once, then served at once while a fresh one is read behind it.
describe('the model lists\' own cache', () => {
  const provider = (lists) => ({ id: 'agy', listModels: vi.fn(async () => lists.shift()) })
  const A = [DEFAULT_MODEL, { id: 'a', label: 'A' }]
  const B = [DEFAULT_MODEL, { id: 'b', label: 'B' }]

  it('waits for the first read, then serves it without asking again', async () => {
    let now = 0
    const lists = createModelLists({ ttlMs: 1000, now: () => now })
    const agy = provider([A, B])
    expect(await lists(agy, { run: null, path: '/bin/agy' })).toBe(A)
    now = 999
    expect(await lists(agy, { run: null, path: '/bin/agy' })).toBe(A)
    expect(agy.listModels).toHaveBeenCalledTimes(1)
  })

  it('serves the old list once it is stale while it reads a new one behind it', async () => {
    let now = 0
    const lists = createModelLists({ ttlMs: 1000, now: () => now })
    const agy = provider([A, B])
    await lists(agy, { path: '/bin/agy' })
    now = 1000
    expect(await lists(agy, { path: '/bin/agy' })).toBe(A)
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(await lists(agy, { path: '/bin/agy' })).toBe(B)
    expect(agy.listModels).toHaveBeenCalledTimes(2)
  })

  it('waits for a new read when the person asks for a refresh', async () => {
    const lists = createModelLists({ ttlMs: 1000, now: () => 0 })
    const agy = provider([A, B])
    await lists(agy, { path: '/bin/agy' })
    expect(await lists(agy, { path: '/bin/agy', refresh: true })).toBe(B)
  })

  it('keeps the last list when a read throws, and has none for a provider that lists nothing', async () => {
    let now = 0
    const lists = createModelLists({ ttlMs: 1000, now: () => now })
    const agy = { id: 'agy', listModels: vi.fn().mockResolvedValueOnce(A).mockRejectedValueOnce(new Error('boom')) }
    await lists(agy, { path: '/bin/agy' })
    now = 5000
    expect(await lists(agy, { path: '/bin/agy', refresh: true })).toBe(A)
    expect(await lists({ id: 'ollama' }, { path: '/bin/ollama' })).toEqual([])
  })

  it('is what a detector serves, so a minute later nothing is listed again', async () => {
    let now = 0
    const listRun = vi.fn(async () => ({ stdout: AGY_MODELS_STDOUT, stderr: '', code: 0 }))
    const versions = vi.fn(async () => ({ stdout: '1.2.14\n', stderr: '', code: 0 }))
    const detect = createDetector({ locate: (n) => `/bin/${n}`, run: versions, listRun, home: NO_HOME, providers: [AGY], now: () => now })
    await detect()
    now = 61000
    const [agy] = await detect()
    expect(agy.models).toHaveLength(15)
    expect(versions).toHaveBeenCalledTimes(2)
    expect(listRun).toHaveBeenCalledTimes(1)
    await detect({ refresh: true })
    expect(listRun).toHaveBeenCalledTimes(2)
  })
})

describe('binding a CLI\'s saved model', () => {
  const detected = [row(CLAUDE, { models: CLAUDE_MODELS }), row(AGY, { models: [DEFAULT_MODEL, ...parseAgyModels(AGY_MODELS_STDOUT)] })]

  it('binds the saved alias while it is listed, and Default otherwise', () => {
    expect(withModel(CLAUDE, detected, 'haiku').model).toEqual({ id: 'haiku', label: 'Haiku' })
    expect(withModel(CLAUDE, detected, null).model).toBe(DEFAULT_MODEL)
    expect(withModel(CLAUDE, detected, 'opus --dangerously-skip-permissions').model).toBe(DEFAULT_MODEL)
    expect(withModel(AGY, detected, 'claude-sonnet-4-6').model).toEqual({ id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Thinking)' })
  })

  // Signed out since it was picked: Default, and no flag, rather than a
  // model the account can no longer run.
  it('binds Default for Antigravity when its listing no longer names the pick', () => {
    expect(withModel(AGY, [row(AGY, { models: [DEFAULT_MODEL] })], 'claude-sonnet-4-6').model).toBe(DEFAULT_MODEL)
  })

  it('reaches the command line through the selector', async () => {
    const select = createSelector(async () => detected, async () => 'agy', async (id) => (id === 'agy' ? 'gemini-3.1-pro-low' : null))
    const provider = await select('web')
    const run = vi.fn(async () => ({ stdout: agyReply('ok'), stderr: '', code: 0, collected: agyRan() }))
    await callProvider({ provider, prompt: 'hi', tools: 'web', run, locate: () => '/bin/agy', scratch })
    expect(argsOf(run).slice(-2)).toEqual(['--model', 'gemini-3.1-pro-low'])
  })
})
