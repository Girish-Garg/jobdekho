import { describe, it, expect, vi, afterEach } from 'vitest'
import { createServer } from 'node:http'
import { OLLAMA, PROVIDERS } from '@jobdekho/server/ai/providers.js'
import { ollamaOrigin, NOT_RUNNING } from '@jobdekho/server/ai/ollama-origin.js'
import { httpJson, isLoopback, offline } from '@jobdekho/server/ai/http-json.js'
import { stripThink } from '@jobdekho/server/ai/think-tags.js'
import { contextFor } from '@jobdekho/server/ai/ollama-context.js'
import { probeOllama } from '@jobdekho/server/ai/ollama-probe.js'
import { requestOllama } from '@jobdekho/server/ai/ollama-request.js'
import { ProviderError } from '@jobdekho/server/ai/errors.js'

// Every Ollama here is a fake `http`: nothing in this file reaches a real
// model server. The one exception is the http-json.js plumbing at the end,
// which talks to a server this file starts on 127.0.0.1, the way ai.test.js
// spawns node itself to prove the process plumbing.
const NO_ENV = {}
const MODEL = { id: 'llama3.2:3b', label: 'llama3.2:3b', contextLength: 131072, tools: true }

async function rejection(promise) {
  try { await promise } catch (err) { return err }
  throw new Error('expected a rejection')
}

// A fake Ollama answering by path, recording what it was asked.
function server(routes) {
  return vi.fn(async ({ url, method = 'GET', body }) => {
    const path = new URL(url).pathname
    const route = routes[`${method} ${path}`]
    if (!route) throw Object.assign(new Error(`nothing at ${method} ${path}`), { code: 'ECONNREFUSED' })
    return typeof route === 'function' ? route(body) : route
  })
}

const tag = (name, over = {}) => ({
  name, model: name, size: 2019393189, details: { family: 'llama', context_length: 131072 }, capabilities: ['completion', 'tools'], ...over,
})
const generated = (response, over = {}) => ({ status: 200, body: { model: MODEL.name, response, done: true, done_reason: 'stop', ...over } })

describe('the Ollama entry', () => {
  it('comes last, so a CLI above it answers first unless Ollama is picked', () => {
    expect(PROVIDERS.at(-1)).toBe(OLLAMA)
    expect(OLLAMA).toMatchObject({ id: 'ollama', label: 'Ollama', binary: 'ollama', install: 'https://ollama.com' })
  })

  // It can honour 'web', but only where its probe found it can search right
  // now (see ollama-web-probe.js); until then detection says 'none' alone.
  it('can honour both policies, and reports none alone until probed', () => {
    expect(OLLAMA.policies).toEqual(['none', 'web'])
    expect(OLLAMA.policiesUnprobed).toEqual(['none'])
    expect(OLLAMA.promptArgs('web')).toEqual([])
    expect(OLLAMA.promptArgs('none')).toEqual([])
    expect(() => OLLAMA.promptArgs('default')).toThrow(/unknown tool policy/)
  })

  it('takes a web call only on a model that uses tools', () => {
    expect(OLLAMA.canUse({ id: 'a', tools: true }, 'web')).toBe(true)
    expect(OLLAMA.canUse({ id: 'b', tools: false }, 'web')).toBe(false)
    expect(OLLAMA.canUse({ id: 'b', tools: false }, 'none')).toBe(true)
  })

  it('is asked over its API with a longer timeout, and names its own sign-in command', () => {
    expect(typeof OLLAMA.request).toBe('function')
    expect(typeof OLLAMA.probe).toBe('function')
    expect(OLLAMA.timeoutScale).toBeGreaterThan(1)
    expect(OLLAMA.loginPattern).toBeUndefined()
    expect(OLLAMA.local).toBe(true)
    expect(new ProviderError('failed', OLLAMA, 'unauthorized').kind).toBe('failed')
    expect(new ProviderError('login', OLLAMA, 'signed out').message)
      .toBe('Ollama is not signed in (signed out). Open a terminal, run "ollama signin", finish signing in, then try again.')
  })
})

describe('ollamaOrigin', () => {
  it('is 127.0.0.1:11434 unless OLLAMA_HOST says otherwise', () => {
    expect(ollamaOrigin(NO_ENV)).toBe('http://127.0.0.1:11434')
    expect(ollamaOrigin({ OLLAMA_HOST: '  ' })).toBe('http://127.0.0.1:11434')
  })

  it('follows OLLAMA_HOST to another port or loopback name on this computer', () => {
    expect(ollamaOrigin({ OLLAMA_HOST: '127.0.0.1:8080' })).toBe('http://127.0.0.1:8080')
    expect(ollamaOrigin({ OLLAMA_HOST: 'http://localhost:9000' })).toBe('http://localhost:9000')
    expect(ollamaOrigin({ OLLAMA_HOST: 'localhost' })).toBe('http://localhost:11434')
    expect(ollamaOrigin({ OLLAMA_HOST: '[::1]:11500' })).toBe('http://[::1]:11500')
  })

  // The server's "listen everywhere" setting, which a client reaches locally.
  it('reads a bind-everything address as this computer', () => {
    expect(ollamaOrigin({ OLLAMA_HOST: '0.0.0.0' })).toBe('http://127.0.0.1:11434')
    expect(ollamaOrigin({ OLLAMA_HOST: 'http://0.0.0.0:11434' })).toBe('http://127.0.0.1:11434')
  })

  it('never follows it to another machine, or to https, or through a typo', () => {
    expect(ollamaOrigin({ OLLAMA_HOST: '192.168.1.20:11434' })).toBe('http://127.0.0.1:11434')
    expect(ollamaOrigin({ OLLAMA_HOST: 'https://ollama.example.com' })).toBe('http://127.0.0.1:11434')
    expect(ollamaOrigin({ OLLAMA_HOST: 'http://127.0.0.1.evil.test:11434' })).toBe('http://127.0.0.1:11434')
    expect(ollamaOrigin({ OLLAMA_HOST: 'http://[bad' })).toBe('http://127.0.0.1:11434')
  })
})

describe('stripThink', () => {
  it('drops a whole thinking block and keeps the answer', () => {
    expect(stripThink('<think>\nThe user wants {"x":1}.\n</think>\n\n{"ok":true}')).toBe('{"ok":true}')
    expect(stripThink('<THINKING>a</THINKING>{"a":1}<think>b</think>')).toBe('{"a":1}')
  })

  // Measured: a template that opens the tag leaves only the closing one.
  it('drops everything up to a closing tag whose opening was in the template', () => {
    expect(stripThink('The user wants JSON.\nI will write {"no": 1}.\n</think>\n\n{"ok":true}')).toBe('{"ok":true}')
  })

  it('drops thinking that never finished, a reply cut off mid-thought', () => {
    expect(stripThink('<think>Let me see, {"half":')).toBe('')
    expect(stripThink('{"ok":true}\n<think>and then')).toBe('{"ok":true}')
  })

  it('leaves a reply with no thinking as it was, trimmed', () => {
    expect(stripThink('  {"letter":"Dear team"}\n')).toBe('{"letter":"Dear team"}')
    expect(stripThink(undefined)).toBe('')
  })
})

describe('contextFor', () => {
  it('sizes the context to the prompt plus room for the reply, in powers of two', () => {
    expect(contextFor('x'.repeat(300))).toMatchObject({ promptTokens: 100, numCtx: 16384 })
    expect(contextFor('x'.repeat(30000)).numCtx).toBe(32768)
    expect(contextFor('x'.repeat(54103)).numCtx).toBe(32768)
    expect(contextFor('x'.repeat(200000)).numCtx).toBe(131072)
  })

  // The reply is capped at what is left, so it cannot push the prompt out.
  it('caps the reply at what the context has left, and the context at the model', () => {
    const { numCtx, numPredict, promptTokens } = contextFor('x'.repeat(30000), 20000)
    expect(numCtx).toBe(20000)
    expect(numPredict).toBe(20000 - promptTokens)
  })
})

describe('probeOllama', () => {
  it('reports the server not running when nothing answers', async () => {
    const out = await probeOllama({ http: offline, env: NO_ENV })
    expect(out).toEqual({ runs: false, version: null, models: [], error: NOT_RUNNING, policies: ['none'], webHint: null })
    expect(out.error).toBe('Ollama is installed but not running: start the Ollama app, or run "ollama serve" in a terminal.')
  })

  it('reports not running when something else holds the port', async () => {
    const http = server({ 'GET /api/version': { status: 404, body: null }, 'GET /api/tags': { status: 404, body: null } })
    expect(await probeOllama({ http, env: NO_ENV })).toMatchObject({ runs: false, error: NOT_RUNNING })
  })

  it('says to pull a model when the server has none', async () => {
    const http = server({ 'GET /api/version': { status: 200, body: { version: '0.32.12' } }, 'GET /api/tags': { status: 200, body: { models: [] } } })
    const out = await probeOllama({ http, env: NO_ENV })
    expect(out).toMatchObject({ runs: false, version: '0.32.12', models: [] })
    expect(out.error).toBe('Ollama has no models yet: run "ollama pull llama3.2" in a terminal, then check again.')
  })

  it('lists the installed models with their size, context and tool use, and runs', async () => {
    const qwen = tag('qwen3:8b', { size: 5225388164, details: { context_length: 40960 } })
    const plain = tag('gemma:2b', { capabilities: ['completion'] })
    const http = server({
      'GET /api/version': { status: 200, body: { version: '0.32.12' } },
      'GET /api/tags': { status: 200, body: { models: [plain, qwen] } },
    })
    expect(await probeOllama({ http, env: NO_ENV })).toMatchObject({
      runs: true, version: '0.32.12', error: null,
      models: [
        { id: 'gemma:2b', label: 'gemma:2b', size: 2019393189, contextLength: 131072, tools: false },
        { id: 'qwen3:8b', label: 'qwen3:8b', size: 5225388164, contextLength: 40960, tools: true },
      ],
    })
    expect(http.mock.calls.slice(0, 2).map(([req]) => req.url)).toEqual(['http://127.0.0.1:11434/api/version', 'http://127.0.0.1:11434/api/tags'])
  })

  // A cloud model would send the resume to ollama.com; an embedding model
  // cannot write a reply.
  it('leaves out cloud models and models that cannot write', async () => {
    const models = [
      tag('gpt-oss:120b-cloud', { remote_host: 'https://ollama.com:443', remote_model: 'gpt-oss:120b' }),
      tag('my-remote', { remote_model: 'deepseek-v3.1:671b' }),
      tag('qwen3-coder:480b-cloud'),
      tag('nomic-embed-text:latest', { capabilities: ['embedding'] }),
      tag('old-listing:7b', { capabilities: undefined }),
    ]
    const http = server({ 'GET /api/version': { status: 200, body: {} }, 'GET /api/tags': { status: 200, body: { models } } })
    const out = await probeOllama({ http, env: NO_ENV })
    expect(out.models.map((m) => m.id)).toEqual(['old-listing:7b'])
    expect(out.version).toBeNull()
  })

  it('says why when every model it has is a cloud one', async () => {
    const models = [tag('gpt-oss:20b-cloud', { remote_host: 'https://ollama.com:443' })]
    const http = server({ 'GET /api/version': { status: 200, body: {} }, 'GET /api/tags': { status: 200, body: { models } } })
    const out = await probeOllama({ http, env: NO_ENV })
    expect(out.runs).toBe(false)
    expect(out.error).toMatch(/only cloud ones, which send the prompt to ollama\.com/)
  })

  // Its web check posts, but never a body: nothing it sends could be a
  // prompt or a search.
  it('never asks for a generation or a search while probing', async () => {
    const http = server({ 'GET /api/version': { status: 200, body: {} }, 'GET /api/tags': { status: 200, body: { models: [tag('a')] } } })
    await probeOllama({ http, env: NO_ENV })
    const paths = http.mock.calls.map(([req]) => new URL(req.url).pathname)
    expect(paths.some((p) => /generate|chat/.test(p))).toBe(false)
    expect(http.mock.calls.every(([req]) => req.body === undefined)).toBe(true)
  })
})

describe('requestOllama', () => {
  const ask = (http, over = {}) => requestOllama({ prompt: 'Reply with {"ok":true}', model: MODEL, http, env: NO_ENV, ...over }, OLLAMA)

  it('asks /api/generate for the whole reply as JSON, thinking off, with a context sized to the prompt', async () => {
    const http = server({ 'POST /api/generate': generated('{"ok":true}') })
    expect(await ask(http)).toBe('{"ok":true}')
    const [{ url, body }] = http.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:11434/api/generate')
    expect(body).toEqual({
      model: 'llama3.2:3b', prompt: 'Reply with {"ok":true}', stream: false, think: false, format: 'json',
      options: { num_ctx: 16384, num_predict: 16384 - 8 },
    })
  })

  it('leaves the format free for a caller that reads prose', async () => {
    const http = server({ 'POST /api/generate': generated('Hello there') })
    expect(await ask(http, { json: false })).toBe('Hello there')
    expect(http.mock.calls[0][0].body.format).toBeUndefined()
  })

  it('strips thinking out of the reply', async () => {
    const http = server({ 'POST /api/generate': generated('<think>hmm {"no":1}</think>\n{"ok":true}') })
    expect(await ask(http)).toBe('{"ok":true}')
  })

  it('asks again without the thinking switch for a model that has none', async () => {
    let calls = 0
    const http = server({
      'POST /api/generate': (body) => {
        calls += 1
        if ('think' in body) return { status: 400, body: { error: '"llama3.2:3b" does not support thinking' } }
        return generated('{"ok":true}')
      },
    })
    expect(await ask(http)).toBe('{"ok":true}')
    expect(calls).toBe(2)
    expect(http.mock.calls[1][0].body.format).toBe('json')
  })

  it('reads a refused connection as Ollama not running, which another AI may answer instead of', async () => {
    const err = await rejection(ask(offline))
    expect(err).toBeInstanceOf(ProviderError)
    expect(err.kind).toBe('not_found')
    expect(err.message).toBe(NOT_RUNNING)
  })

  it('reads a 404 as the model gone since detection listed it', async () => {
    const http = server({ 'POST /api/generate': { status: 404, body: { error: 'model "llama3.2:3b" not found, try pulling it first' } } })
    const err = await rejection(ask(http))
    expect(err.kind).toBe('not_found')
    expect(err.message).toMatch(/no longer has the model "llama3\.2:3b".*ollama pull llama3\.2:3b/)
  })

  it('passes Ollama\'s own sentence on for any other failure', async () => {
    const http = server({ 'POST /api/generate': { status: 500, body: { error: 'model requires more system memory (9.1 GiB) than is available (6.0 GiB)' } } })
    const err = await rejection(ask(http))
    expect(err.kind).toBe('failed')
    expect(err.message).toMatch(/^Ollama could not finish: model requires more system memory/)
  })

  it('says a reply that filled its context was cut off, rather than handing half of it on', async () => {
    const http = server({ 'POST /api/generate': generated('{"letter":"Dear', { done_reason: 'length' }) })
    const err = await rejection(ask(http))
    expect(err.kind).toBe('failed')
    expect(err.message).toMatch(/filled the 16384-token context it was given and was cut off/)
  })

  it('refuses a prompt the model cannot hold, without asking it', async () => {
    const http = server({})
    const err = await rejection(ask(http, { prompt: 'x'.repeat(30000), model: { id: 'tiny:1b', contextLength: 8192 } }))
    expect(err.kind).toBe('failed')
    expect(err.message).toMatch(/too long for "tiny:1b".*holds 8192/)
    expect(http).not.toHaveBeenCalled()
  })

  it('refuses to run without a model, and says where to pick one', async () => {
    const err = await rejection(ask(server({}), { model: undefined }))
    expect(err.kind).toBe('not_found')
    expect(err.message).toMatch(/Pick one in Settings/)
  })

  it('leaves an aborted request to the caller, which reports its own timeout', async () => {
    const controller = new AbortController()
    controller.abort()
    const aborted = Object.assign(new Error('aborted'), { name: 'AbortError', code: 'ABORT_ERR' })
    const err = await rejection(ask(vi.fn(async () => { throw aborted }), { signal: controller.signal }))
    expect(err).toBe(aborted)
  })
})

describe('httpJson', () => {
  let listening = null
  afterEach(() => listening?.close())

  function start(handler) {
    return new Promise((resolve) => {
      listening = createServer(handler).listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${listening.address().port}`))
    })
  }

  it('refuses any host that is not this computer before connecting', async () => {
    expect(isLoopback('127.0.0.1')).toBe(true)
    expect(isLoopback('localhost')).toBe(true)
    expect(isLoopback('[::1]')).toBe(true)
    expect(isLoopback('ollama.com')).toBe(false)
    expect(isLoopback('10.0.0.5')).toBe(false)
    const err = await rejection(httpJson({ url: 'http://ollama.com/api/generate', method: 'POST', body: { prompt: 'resume' } }))
    expect(err.message).toMatch(/not this computer/)
  })

  it('posts JSON and reads the JSON reply with its status', async () => {
    const origin = await start((req, res) => {
      let text = ''
      req.on('data', (d) => { text += d })
      req.on('end', () => {
        res.writeHead(201, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ got: JSON.parse(text), type: req.headers['content-type'] }))
      })
    })
    expect(await httpJson({ url: `${origin}/api/generate`, method: 'POST', body: { a: 1 } })).toEqual({
      status: 201, body: { got: { a: 1 }, type: 'application/json' },
    })
  })

  it('reads a body that is not JSON as null', async () => {
    const origin = await start((req, res) => res.end('Ollama is running'))
    expect(await httpJson({ url: origin })).toEqual({ status: 200, body: null })
  })

  it('gives up when the signal aborts, however long the reply would take', async () => {
    const origin = await start(() => {})
    const err = await rejection(httpJson({ url: origin, signal: AbortSignal.timeout(50) }))
    expect(err.name).toMatch(/Abort/)
  })
})
