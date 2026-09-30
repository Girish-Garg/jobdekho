import { describe, it, expect, vi } from 'vitest'
import { OLLAMA, CLAUDE } from '@jobdekho/server/ai/providers.js'
import { probeOllama } from '@jobdekho/server/ai/ollama-probe.js'
import { probeOllamaWeb } from '@jobdekho/server/ai/ollama-web-probe.js'
import { requestOllama } from '@jobdekho/server/ai/ollama-request.js'
import { WEB_TOOLS, RESULT_CHARS, runWebTool, SEARCH_PATH, FETCH_PATH } from '@jobdekho/server/ai/ollama-web-tools.js'
import { keepSeenSources } from '@jobdekho/server/ai/ollama-web-sources.js'
import { callWithFallback } from '@jobdekho/server/ai/fallback.js'
import { httpJson, isLoopback } from '@jobdekho/server/ai/http-json.js'
import { buildApp } from '@jobdekho/server/app.js'

// Ollama's web search, through the local server's own proxy to ollama.com.
// Every Ollama here is a fake `http`: nothing reaches a model or the web.
const NO_ENV = {}
const QWEN = { id: 'qwen3:8b', label: 'qwen3:8b', contextLength: 40960, tools: true }
const PLAIN = { id: 'gemma:2b', label: 'gemma:2b', contextLength: 8192, tools: false }

const SIGNIN = 'Sign in with "ollama signin" in a terminal to let Ollama search the web; it needs a free ollama.com account.'

async function rejection(promise) {
  try { await promise } catch (err) { return err }
  throw new Error('expected a rejection')
}

// A fake Ollama answering by method and path, recording what it was asked.
function server(routes) {
  return vi.fn(async ({ url, method = 'GET', body }) => {
    const path = new URL(url).pathname
    const route = routes[`${method} ${path}`]
    if (!route) throw Object.assign(new Error(`nothing at ${method} ${path}`), { code: 'ECONNREFUSED' })
    return typeof route === 'function' ? route(body) : route
  })
}

// /api/chat answering each turn in order: a list of tool calls, or text.
function turns(...replies) {
  let i = 0
  return (body) => {
    const reply = replies[Math.min(i, replies.length - 1)]
    i += 1
    const message = Array.isArray(reply)
      ? { role: 'assistant', content: '', tool_calls: reply.map(([name, args], n) => ({ id: `call_${i}_${n}`, function: { index: n, name, arguments: args } })) }
      : { role: 'assistant', content: reply }
    return { status: 200, body: { model: body.model, message, done: true, done_reason: 'stop' } }
  }
}

const RESULTS = { results: [{ title: 'Acme Careers', url: 'https://acme.example/careers', content: 'Open roles at Acme.' }] }
const ANSWER = '{"reply":"Acme is hiring.","sources":["https://acme.example/careers"]}'
const ask = (http, over = {}) => requestOllama({ prompt: 'Is Acme hiring?', tools: 'web', model: QWEN, http, env: NO_ENV, ...over }, OLLAMA)
const bodies = (http, path) => http.mock.calls.map(([req]) => req).filter((req) => new URL(req.url).pathname === path).map((req) => req.body)

describe('probeOllamaWeb', () => {
  const asking = (answers) => vi.fn(async (method, path) => answers[`${method} ${path}`] ?? null)
  const ALL_GOOD = {
    [`POST ${SEARCH_PATH}`]: { status: 400, body: { error: 'missing request body' } },
    'GET /api/status': { status: 200, body: { cloud: { disabled: false, source: 'none' } } },
    'POST /api/me': { status: 200, body: { name: 'someone' } },
  }

  it('honours web when a model uses tools, the route is there, cloud is on and it is signed in', async () => {
    expect(await probeOllamaWeb({ models: [PLAIN, QWEN], ask: asking(ALL_GOOD) })).toEqual({ policies: ['none', 'web'], webHint: null })
  })

  it('says to pull a model that uses tools, before asking the server anything', async () => {
    const ask = asking(ALL_GOOD)
    const out = await probeOllamaWeb({ models: [PLAIN], ask })
    expect(out).toEqual({ policies: ['none'], webHint: 'Pull a model that can use tools, such as "ollama pull qwen3:4b", to let Ollama search the web.' })
    expect(ask).not.toHaveBeenCalled()
  })

  it('says to update an Ollama that has no web search route', async () => {
    const ask = asking({ ...ALL_GOOD, [`POST ${SEARCH_PATH}`]: { status: 404, body: null } })
    expect((await probeOllamaWeb({ models: [QWEN], ask })).webHint).toMatch(/^Update Ollama to let it search the web/)
    expect(ask).not.toHaveBeenCalledWith('POST', '/api/me')
  })

  it('says to turn cloud features back on when they are off', async () => {
    const ask = asking({ ...ALL_GOOD, 'GET /api/status': { status: 200, body: { cloud: { disabled: true, source: 'config' } } } })
    expect(await probeOllamaWeb({ models: [QWEN], ask })).toEqual({
      policies: ['none'], webHint: 'Turn Ollama\'s cloud features back on to let it search the web; its searches go through ollama.com.',
    })
    expect(ask).not.toHaveBeenCalledWith('POST', '/api/me')
  })

  // Measured on 0.32.12, signed out: /api/me answers 401.
  it('says to sign in when ollama.com does not know the key', async () => {
    const ask = asking({ ...ALL_GOOD, 'POST /api/me': { status: 401, body: { error: 'unauthorized', signin_url: 'https://ollama.com/connect?x' } } })
    expect(await probeOllamaWeb({ models: [QWEN], ask })).toEqual({ policies: ['none'], webHint: SIGNIN })
  })

  it('says ollama.com did not answer when it cannot tell', async () => {
    for (const me of [null, { status: 502, body: { error: 'bad gateway' } }]) {
      const out = await probeOllamaWeb({ models: [QWEN], ask: asking({ ...ALL_GOOD, 'POST /api/me': me }) })
      expect(out).toEqual({ policies: ['none'], webHint: 'Ollama cannot search the web right now: ollama.com, which its searches go through, did not answer.' })
    }
  })

  it('is part of detection, and never sends a body, a prompt or a search', async () => {
    const tags = { models: [{ name: 'qwen3:8b', size: 5225388164, details: { context_length: 40960 }, capabilities: ['completion', 'tools', 'thinking'] }] }
    const http = server({
      'GET /api/version': { status: 200, body: { version: '0.32.12' } },
      'GET /api/tags': { status: 200, body: tags },
      ...ALL_GOOD,
    })
    expect(await probeOllama({ http, env: NO_ENV })).toMatchObject({ runs: true, policies: ['none', 'web'], webHint: null })
    expect(http.mock.calls.every(([req]) => req.body === undefined)).toBe(true)
    expect(http.mock.calls.map(([req]) => new URL(req.url).pathname).sort())
      .toEqual(['/api/me', '/api/status', '/api/tags', '/api/version', SEARCH_PATH].sort())
  })
})

describe('the web tools', () => {
  it('offers exactly web_search and web_fetch', () => {
    expect(WEB_TOOLS.map((t) => t.function.name)).toEqual(['web_search', 'web_fetch'])
    expect(WEB_TOOLS.every((t) => t.type === 'function' && t.function.parameters.type === 'object')).toBe(true)
  })

  it('runs nothing for a tool it does not offer', async () => {
    const post = vi.fn()
    for (const name of ['run_command', 'read_file', '', undefined]) {
      const out = await runWebTool({ function: { name, arguments: { path: '/etc/passwd' } } }, post)
      expect(out).toMatchObject({ sent: false })
      expect(out.content).toMatch(/is not available\. Use web_search or web_fetch\./)
    }
    expect(post).not.toHaveBeenCalled()
  })

  it('refuses arguments it cannot use, without a request', async () => {
    const post = vi.fn()
    expect((await runWebTool({ function: { name: 'web_search', arguments: { query: '  ' } } }, post)).content).toMatch(/needs a query/)
    expect((await runWebTool({ function: { name: 'web_search', arguments: { query: 'x'.repeat(301) } } }, post)).content).toMatch(/needs a query/)
    expect((await runWebTool({ function: { name: 'web_fetch', arguments: { url: 'file:///C:/Users/x/cv.pdf' } } }, post)).content).toMatch(/http or https/)
    expect((await runWebTool({ function: { name: 'web_fetch', arguments: 'not json' } }, post)).content).toMatch(/http or https/)
    expect(post).not.toHaveBeenCalled()
  })

  it('searches with at most five results, reading arguments given as a JSON string too', async () => {
    const post = vi.fn(async () => ({ status: 200, body: RESULTS }))
    await runWebTool({ function: { name: 'web_search', arguments: { query: ' acme careers ', max_results: 50 } } }, post)
    await runWebTool({ function: { name: 'web_search', arguments: '{"query":"acme"}' } }, post)
    expect(post.mock.calls).toEqual([[SEARCH_PATH, { query: 'acme careers', max_results: 5 }], [SEARCH_PATH, { query: 'acme', max_results: 5 }]])
  })

  it('cuts a result to its limit, and leaves a page\'s links out', async () => {
    const long = { results: [{ title: 't', url: 'https://a.example', content: 'x'.repeat(20000) }] }
    const search = await runWebTool({ function: { name: 'web_search', arguments: { query: 'a' } } }, async () => ({ status: 200, body: long }))
    expect(search.content).toHaveLength(RESULT_CHARS)
    const page = { title: 'Acme', content: 'We hire.', links: ['https://tracker.example/pixel'] }
    const fetched = await runWebTool({ function: { name: 'web_fetch', arguments: { url: 'https://acme.example' } } }, async () => ({ status: 200, body: page }))
    expect(JSON.parse(fetched.content)).toEqual({ url: 'https://acme.example', title: 'Acme', content: 'We hire.' })
  })

  it('hands a failed search back to the model as the tool\'s answer', async () => {
    const out = await runWebTool({ function: { name: 'web_search', arguments: { query: 'a' } } }, async () => ({ status: 429, body: { error: 'rate limited' } }))
    expect(out).toEqual({ name: 'web_search', content: 'web_search failed: rate limited', sent: true, urls: [] })
  })
})

describe('a web call to Ollama', () => {
  it('searches, then answers from the results, all on this computer\'s server', async () => {
    const http = server({
      'POST /api/chat': turns([['web_search', { query: 'Acme careers' }]], ANSWER),
      [`POST ${SEARCH_PATH}`]: { status: 200, body: RESULTS },
    })
    expect(await ask(http)).toBe(ANSWER)
    const urls = http.mock.calls.map(([req]) => req.url)
    expect(urls).toEqual(['http://127.0.0.1:11434/api/chat', `http://127.0.0.1:11434${SEARCH_PATH}`, 'http://127.0.0.1:11434/api/chat'])
    const [first, second] = bodies(http, '/api/chat')
    expect(first).toMatchObject({ model: 'qwen3:8b', stream: false, think: false, tools: WEB_TOOLS })
    expect(first.format).toBeUndefined()
    expect(first.messages[0]).toMatchObject({ role: 'system', content: expect.stringMatching(/web_search.*web_fetch.*Search before you answer/) })
    expect(first.messages[1]).toEqual({ role: 'user', content: 'Is Acme hiring?' })
    expect(second.messages.at(-1)).toEqual({ role: 'tool', tool_name: 'web_search', tool_call_id: 'call_1_0', content: JSON.stringify(RESULTS.results) })
    expect(second.messages.at(-2)).toMatchObject({ role: 'assistant', tool_calls: [{ function: { name: 'web_search' } }] })
  })

  // Sized once, for the prompt and every result the loop allows, so the
  // model is not reloaded between turns.
  it('keeps one context for every turn, with room for the results', async () => {
    const http = server({
      'POST /api/chat': turns([['web_search', { query: 'a' }]], [['web_fetch', { url: 'https://acme.example' }]], ANSWER),
      [`POST ${SEARCH_PATH}`]: { status: 200, body: RESULTS },
      [`POST ${FETCH_PATH}`]: { status: 200, body: { title: 'Acme', content: 'Hiring.' } },
    })
    await ask(http)
    const contexts = bodies(http, '/api/chat').map((b) => b.options.num_ctx)
    expect(new Set(contexts)).toEqual(new Set([32768]))
  })

  it('answers a model that asks for a tool it was not offered, and runs nothing for it', async () => {
    const http = server({ 'POST /api/chat': turns([['run_command', { command: 'type cv.txt' }]], ANSWER) })
    expect(JSON.parse(await ask(http))).toEqual({ reply: 'Acme is hiring.', sources: [] })
    expect(http.mock.calls.map(([req]) => new URL(req.url).pathname)).toEqual(['/api/chat', '/api/chat'])
    expect(bodies(http, '/api/chat')[1].messages.at(-1).content).toMatch(/run_command is not available/)
  })

  it('stops offering tools after eight, and asks for the answer held to JSON', async () => {
    const nine = Array.from({ length: 9 }, (_, n) => ['web_search', { query: `q${n}` }])
    const http = server({ 'POST /api/chat': turns(nine, ANSWER), [`POST ${SEARCH_PATH}`]: { status: 200, body: RESULTS } })
    expect(await ask(http)).toBe(ANSWER)
    expect(bodies(http, SEARCH_PATH)).toHaveLength(8)
    const [, last] = bodies(http, '/api/chat')
    expect(last.tools).toBeUndefined()
    expect(last.format).toBe('json')
    expect(last.messages.at(-1).content).toMatch(/used all its searches/)
  })

  it('stops after six turns however few searches each asked for', async () => {
    const http = server({ 'POST /api/chat': turns(...Array(5).fill([['web_search', { query: 'a' }]]), 'finally'), [`POST ${SEARCH_PATH}`]: { status: 200, body: RESULTS } })
    expect(await ask(http, { json: false })).toBe('finally')
    const chats = bodies(http, '/api/chat')
    expect(chats).toHaveLength(6)
    expect(chats.at(-1).tools).toBeUndefined()
    expect(chats.at(-1).format).toBeUndefined()
  })

  it('strips thinking from the answer', async () => {
    const http = server({ 'POST /api/chat': turns([['web_search', { query: 'a' }]], `<think>hmm {"x":1}</think>${ANSWER}`), [`POST ${SEARCH_PATH}`]: { status: 200, body: RESULTS } })
    expect(await ask(http)).toBe(ANSWER)
  })

  it('asks again without the thinking switch for a model that has none', async () => {
    const chat = turns([['web_search', { query: 'a' }]], ANSWER)
    const http = server({
      'POST /api/chat': (body) => ('think' in body ? { status: 400, body: { error: 'model does not support thinking' } } : chat(body)),
      [`POST ${SEARCH_PATH}`]: { status: 200, body: RESULTS },
    })
    expect(await ask(http)).toBe(ANSWER)
  })

  // Measured: qwen3:8b answered from memory without a single search.
  it('asks once more to search first when the first turn searched for nothing', async () => {
    const http = server({ 'POST /api/chat': turns(ANSWER, [['web_search', { query: 'Acme careers' }]], ANSWER), [`POST ${SEARCH_PATH}`]: { status: 200, body: RESULTS } })
    expect(await ask(http)).toBe(ANSWER)
    // One conversation, sent whole each turn: the nudge sits after the answer.
    const second = bodies(http, '/api/chat')[1]
    expect(second.messages.slice(2, 4)).toEqual([
      { role: 'assistant', content: ANSWER },
      { role: 'user', content: 'Search the web with web_search first, then answer from what it returns.' },
    ])
    expect(bodies(http, SEARCH_PATH)).toHaveLength(1)
  })

  // Asked once: an answer that still searched for nothing is kept, with the
  // sources it could not have read taken out.
  it('keeps a second answer without a search, citing nothing', async () => {
    const http = server({ 'POST /api/chat': turns(ANSWER) })
    expect(JSON.parse(await ask(http))).toEqual({ reply: 'Acme is hiring.', sources: [] })
    expect(bodies(http, '/api/chat')).toHaveLength(2)
  })

  it('hands prose back as it is to a caller that asked for prose', async () => {
    const prose = 'Acme is hiring {"sources":["https://made.up"]} per its site.'
    const http = server({ 'POST /api/chat': turns([['web_search', { query: 'a' }]], prose), [`POST ${SEARCH_PATH}`]: { status: 200, body: RESULTS } })
    expect(await ask(http, { json: false })).toBe(prose)
  })

  it('takes out a cited page no search or fetch returned', async () => {
    const cited = JSON.stringify({ reply: 'Yes.', sources: ['https://acme.example/careers/', 'https://www.jobdekho.com/'] })
    const http = server({ 'POST /api/chat': turns([['web_search', { query: 'a' }]], cited), [`POST ${SEARCH_PATH}`]: { status: 200, body: RESULTS } })
    expect(JSON.parse(await ask(http)).sources).toEqual(['https://acme.example/careers/'])
  })

  // Signed out since detection: stop, and let another AI answer.
  it('reads a 401 from the search as signed out, naming the sign-in command', async () => {
    const http = server({ 'POST /api/chat': turns([['web_search', { query: 'a' }]]), [`POST ${SEARCH_PATH}`]: { status: 401, body: { error: 'Unauthorized' } } })
    const err = await rejection(ask(http))
    expect(err.kind).toBe('login')
    expect(err.message).toMatch(/Ollama is not signed in .* run "ollama signin"/)
  })

  it('reads a 403 as cloud features turned off', async () => {
    const http = server({ 'POST /api/chat': turns([['web_search', { query: 'a' }]]), [`POST ${SEARCH_PATH}`]: { status: 403, body: { error: 'cloud disabled' } } })
    const err = await rejection(ask(http))
    expect(err.kind).toBe('not_found')
    expect(err.message).toMatch(/cloud features are turned off/)
  })

  it('refuses a prompt the model cannot hold with its results, without asking it', async () => {
    const http = server({})
    const err = await rejection(ask(http, { model: { ...QWEN, contextLength: 16384 } }))
    expect(err.kind).toBe('failed')
    expect(err.message).toMatch(/too long for "qwen3:8b"/)
    expect(http).not.toHaveBeenCalled()
  })

  it('moves on to another AI when Ollama turns out to be signed out', async () => {
    const http = server({ 'POST /api/chat': turns([['web_search', { query: 'a' }]]), [`POST ${SEARCH_PATH}`]: { status: 401, body: {} } })
    const select = vi.fn(async (policy, { after }) => (after.includes('ollama') ? CLAUDE : { ...OLLAMA, model: QWEN }))
    const run = vi.fn(async () => ({ stdout: JSON.stringify({ type: 'result', result: ANSWER }), stderr: '', code: 0 }))
    const out = await callWithFallback({ select, policy: 'web', prompt: 'hi', http, run, locate: () => '/bin/claude', scratch: (w) => w('/s') })
    expect(out.provider).toBe(CLAUDE)
  })
})

describe('keepSeenSources', () => {
  const seen = ['https://acme.example/careers', 'https://news.example/acme/']

  // The fake check nests its sources in each check.
  it('prunes every sources list, at any depth, to the pages seen', () => {
    const reply = { verdict: 'genuine', checks: [{ label: 'Company', sources: ['https://news.example/acme', 'https://made.up/'] }], sources: ['https://acme.example/careers'] }
    expect(JSON.parse(keepSeenSources(`Here: ${JSON.stringify(reply)}`, seen))).toEqual({
      verdict: 'genuine', checks: [{ label: 'Company', sources: ['https://news.example/acme'] }], sources: ['https://acme.example/careers'],
    })
  })

  it('leaves a reply that is not JSON, and fields that are not sources, as they are', () => {
    expect(keepSeenSources('Acme is hiring, see https://made.up', seen)).toBe('Acme is hiring, see https://made.up')
    expect(JSON.parse(keepSeenSources('{"reply":"x","sources":"not a list","n":[1]}', seen))).toEqual({ reply: 'x', sources: 'not a list', n: [1] })
  })
})

// No exception to the loopback rule: the search goes out through Ollama's
// own server, never from JobDekho.
describe('the loopback rule', () => {
  it('still refuses ollama.com itself, over http or https', async () => {
    expect(isLoopback('ollama.com')).toBe(false)
    for (const url of ['https://ollama.com/api/web_search', 'http://ollama.com/api/web_search']) {
      const err = await rejection(httpJson({ url, method: 'POST', body: { query: 'acme' } }))
      expect(err.message).toMatch(/not this computer/)
    }
  })
})

// The whole path, from the button to the model: a signed-in Ollama with a
// model that uses tools, preferred, takes "Is this job real?".
describe('a preferred Ollama that can search', () => {
  it('runs the fake check through its web tools', async () => {
    const tags = { models: [{ name: 'qwen3:8b', size: 5e9, details: { context_length: 40960 }, capabilities: ['completion', 'tools'] }] }
    const verdict = JSON.stringify({ verdict: 'genuine', stillOpen: true, summary: 'Real.', checks: [], redFlags: [] })
    const http = server({
      'GET /api/version': { status: 200, body: { version: '0.32.12' } },
      'GET /api/tags': { status: 200, body: tags },
      [`POST ${SEARCH_PATH}`]: (body) => (body === undefined ? { status: 400, body: { error: 'missing request body' } } : { status: 200, body: RESULTS }),
      'GET /api/status': { status: 200, body: { cloud: { disabled: false } } },
      'POST /api/me': { status: 200, body: {} },
      'POST /api/chat': turns([['web_search', { query: 'Acme Pune careers' }]], verdict),
    })
    const posting = { id: 'p1', source: 'internshala', title: 'Frontend Intern', company: 'Acme', url: 'https://acme.example/p1', descriptionText: 'Build.', ghostSignals: [] }
    const store = {
      getPosting: vi.fn(async () => posting),
      getResumeText: vi.fn(async () => 'PRIYA SHARMA RESUME'),
      setAiResult: vi.fn(async (_u, record) => record),
      getProviderPref: vi.fn(async () => ({ provider: 'ollama', models: {} })),
    }
    const app = buildApp({ config: { sessionSecret: 's', devUserId: 'local' }, dashboardStore: store })
    app.decorate('cli', { locate: (n) => (n === 'ollama' ? '/bin/ollama' : null), run: vi.fn(), http })
    await app.ready()
    const res = await app.inject({ method: 'POST', url: '/api/postings/p1/ai/fake-check' })
    expect(res.json()).toMatchObject({ provider: 'ollama', result: { verdict: 'genuine' } })
    const chats = bodies(http, '/api/chat')
    expect(chats[0].messages[0].content).not.toContain('PRIYA SHARMA')
    expect(bodies(http, SEARCH_PATH).filter(Boolean)).toEqual([{ query: 'Acme Pune careers', max_results: 5 }])
  })
})
