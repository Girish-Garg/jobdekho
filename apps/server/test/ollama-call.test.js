import { describe, it, expect, vi } from 'vitest'
import { CLAUDE, AGY, OLLAMA } from '@jobdekho/server/ai/providers.js'
import { callProvider } from '@jobdekho/server/ai/call.js'
import { callWithFallback } from '@jobdekho/server/ai/fallback.js'
import { pickProvider, createSelector } from '@jobdekho/server/ai/select.js'
import { withModel } from '@jobdekho/server/ai/model-choice.js'
import { createDetector } from '@jobdekho/server/ai/detect.js'
import { NOT_RUNNING } from '@jobdekho/server/ai/ollama-origin.js'
import { offline } from '@jobdekho/server/ai/http-json.js'

// Ollama through the same path every CLI takes: call.js, fallback.js,
// select.js and detect.js. Every model server here is a fake `http`.
const LLAMA = { name: 'llama3.2:3b', size: 2019393189, contextLength: 131072 }
const QWEN = { name: 'qwen3:8b', size: 5225388164, contextLength: 40960 }
const BOUND = { ...OLLAMA, model: LLAMA }

const answering = (response) => vi.fn(async () => ({ status: 200, body: { response, done: true, done_reason: 'stop' } }))
const neverSpawn = () => vi.fn(async () => { throw new Error('a test spawned a CLI') })

async function rejection(promise) {
  try { await promise } catch (err) { return err }
  throw new Error('expected a rejection')
}

// Detection rows as detect.js reports them.
const row = (provider, over = {}) => ({
  id: provider.id, label: provider.label, install: provider.install, policies: provider.policies,
  present: false, path: null, runs: false, version: null, error: null, ...over,
})
const ready = (provider, over = {}) => row(provider, { present: true, path: `/bin/${provider.binary}`, runs: true, version: '1.0', ...over })
const ollamaReady = (models = [LLAMA, QWEN]) => ready(OLLAMA, { models })

describe('callProvider with Ollama', () => {
  it('asks the local API with the bound model, and reports the same events a CLI does', async () => {
    const http = answering('{"ok":true}')
    const run = neverSpawn()
    const locate = vi.fn(() => null)
    const events = []
    const out = await callProvider({ provider: BOUND, prompt: 'hi', tools: 'none', emit: (e) => events.push(e), http, run, locate })
    expect(out).toEqual({ provider: 'ollama', text: '{"ok":true}' })
    expect(http.mock.calls[0][0].body).toMatchObject({ model: 'llama3.2:3b', prompt: 'hi', format: 'json' })
    expect(events[0]).toEqual({ event: 'start', provider: 'ollama', path: 'llama3.2:3b' })
    expect(events.map((e) => e.stage).filter(Boolean)).toEqual(['send', 'reply'])
    expect(run).not.toHaveBeenCalled()
    expect(locate).not.toHaveBeenCalled()
  })

  it('passes a caller\'s request for prose through', async () => {
    const http = answering('Plain words')
    await callProvider({ provider: BOUND, prompt: 'hi', tools: 'none', json: false, http, run: neverSpawn() })
    expect(http.mock.calls[0][0].body.format).toBeUndefined()
  })

  // Wiring the wrong provider in is a bug, caught before anything is sent.
  it('refuses a web action before any request is made', async () => {
    const http = answering('{}')
    const err = await rejection(callProvider({ provider: BOUND, prompt: 'hi', tools: 'web', http }))
    expect(err.message).toMatch(/Ollama cannot honour the "web" tool policy/)
    expect(http).not.toHaveBeenCalled()
  })

  it('gives a local model more time than the feature asked for, then reports a timeout in its words', async () => {
    const http = vi.fn(({ signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    }))
    const started = Date.now()
    const err = await rejection(callProvider({ provider: BOUND, prompt: 'hi', tools: 'none', timeoutMs: 20, http }))
    expect(Date.now() - started).toBeGreaterThanOrEqual(20 * OLLAMA.timeoutScale - 5)
    expect(err.kind).toBe('timeout')
    expect(err.message).toMatch(/^Ollama did not answer within 0 seconds/)
  })

  it('never reaches a real server for a caller that fakes the process seam alone', async () => {
    const err = await rejection(callProvider({ provider: BOUND, prompt: 'hi', tools: 'none', run: neverSpawn() }))
    expect(err.kind).toBe('not_found')
    expect(err.message).toBe(NOT_RUNNING)
  })
})

describe('callWithFallback with Ollama', () => {
  // The server stopped between detection and the call: another AI answers.
  it('moves on to the next AI when Ollama is not running', async () => {
    const select = vi.fn(async (policy, { after }) => (after.includes('ollama') ? CLAUDE : BOUND))
    const run = vi.fn(async () => ({ stdout: JSON.stringify({ type: 'result', result: 'from claude' }), stderr: '', code: 0 }))
    const out = await callWithFallback({
      select, policy: 'none', prompt: 'hi', http: offline, run, locate: () => '/bin/claude', scratch: (work) => work('/scratch'),
    })
    expect(out).toEqual({ provider: CLAUDE, text: 'from claude' })
  })

  it('does not spend another AI on a reply Ollama gave but could not finish', async () => {
    const select = vi.fn(async () => BOUND)
    const http = vi.fn(async () => ({ status: 500, body: { error: 'out of memory' } }))
    const err = await rejection(callWithFallback({ select, policy: 'none', prompt: 'hi', http, run: neverSpawn() }))
    expect(err.kind).toBe('failed')
    expect(select).toHaveBeenCalledTimes(1)
  })
})

describe('choosing Ollama', () => {
  it('is picked for a no-tools action when preferred, and never for a web one', () => {
    const detected = [ready(CLAUDE), ready(AGY), ollamaReady()]
    expect(pickProvider(detected, 'none', [], 'ollama')).toBe(OLLAMA)
    expect(pickProvider(detected, 'web', [], 'ollama')).toBe(CLAUDE)
    expect(pickProvider(detected, 'none')).toBe(CLAUDE)
  })

  it('answers a no-tools action when it is the only AI that runs, and still no web one', () => {
    const detected = [row(CLAUDE), row(AGY), ollamaReady()]
    expect(pickProvider(detected, 'none')).toBe(OLLAMA)
    const err = (() => { try { pickProvider(detected, 'web') } catch (e) { return e } })()
    expect(err.kind).toBe('not_found')
    expect(err.message).toMatch(/^Neither Claude Code nor Antigravity is installed/)
    expect(err.message).not.toMatch(/Ollama/)
  })

  // Installing Ollama is not enough, so it is offered in a sentence of its own.
  it('is offered after the CLIs when nothing that could answer is installed', () => {
    const err = (() => { try { pickProvider([row(CLAUDE), row(AGY), row(OLLAMA)], 'none') } catch (e) { return e } })()
    expect(err.message).toBe(
      'Neither Claude Code nor Antigravity is installed, or on the PATH JobDekho was started with. '
      + 'Install Claude Code from https://claude.ai/code or Antigravity from https://antigravity.google, then restart JobDekho. '
      + 'To run the AI on this computer instead, install Ollama from https://ollama.com, '
      + 'pull a model with "ollama pull llama3.2", then restart JobDekho.',
    )
  })

  it('repeats detection\'s sentence for an Ollama that is installed but not running', () => {
    const stopped = row(OLLAMA, { present: true, path: '/bin/ollama', error: NOT_RUNNING, models: [] })
    const err = (() => { try { pickProvider([row(CLAUDE), row(AGY), stopped], 'none') } catch (e) { return e } })()
    expect(err.message).toBe(NOT_RUNNING)
  })
})

describe('binding the model', () => {
  it('binds the saved model while it is installed, else the first one', () => {
    const detected = [ollamaReady()]
    expect(withModel(OLLAMA, detected, 'qwen3:8b').model).toEqual(QWEN)
    expect(withModel(OLLAMA, detected, null).model).toEqual(LLAMA)
    expect(withModel(OLLAMA, detected, 'deleted:7b').model).toEqual(LLAMA)
  })

  it('hands a CLI back untouched', () => {
    expect(withModel(CLAUDE, [ready(CLAUDE)], 'qwen3:8b')).toBe(CLAUDE)
  })

  it('reaches the call through the selector, asking the saved model for Ollama', async () => {
    const getModel = vi.fn(async (id) => (id === 'ollama' ? 'qwen3:8b' : null))
    const select = createSelector(async () => [row(CLAUDE), row(AGY), ollamaReady()], async () => 'ollama', getModel)
    const provider = await select('none')
    expect(provider).toMatchObject({ id: 'ollama', model: QWEN })
    expect(getModel).toHaveBeenCalledWith('ollama')
    const http = answering('{"ok":true}')
    await callProvider({ provider, prompt: 'hi', tools: 'none', http })
    expect(http.mock.calls[0][0].body.model).toBe('qwen3:8b')
  })
})

describe('detecting Ollama', () => {
  const tags = { models: [{ name: 'llama3.2:3b', size: 2019393189, details: { context_length: 131072 }, capabilities: ['completion'] }] }
  const serving = vi.fn(async ({ url }) => (url.endsWith('/api/tags') ? { status: 200, body: tags } : { status: 200, body: { version: '0.32.12' } }))

  it('asks its server, not a version probe, and lists the models', async () => {
    const run = vi.fn()
    const [ollama] = await createDetector({ locate: () => '/usr/bin/ollama', run, http: serving, providers: [OLLAMA] })()
    expect(ollama).toEqual({
      id: 'ollama', label: 'Ollama', install: 'https://ollama.com', policies: ['none'],
      present: true, path: '/usr/bin/ollama', runs: true, version: '0.32.12', error: null,
      models: [{ name: 'llama3.2:3b', size: 2019393189, contextLength: 131072 }],
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('reports it absent without asking any server when the binary is not on PATH', async () => {
    const http = vi.fn()
    const [ollama] = await createDetector({ locate: () => null, http, providers: [OLLAMA] })()
    expect(ollama).toMatchObject({ present: false, runs: false, error: null, models: [] })
    expect(http).not.toHaveBeenCalled()
  })

  it('reaches no server for a caller that fakes the process seam alone', async () => {
    const [ollama] = await createDetector({ locate: () => '/usr/bin/ollama', run: vi.fn(), providers: [OLLAMA] })()
    expect(ollama).toMatchObject({ present: true, runs: false, error: NOT_RUNNING })
  })
})
