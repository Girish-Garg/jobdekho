import { ProviderError } from './errors.js'
import { ollamaOrigin } from './ollama-origin.js'
import { contextFor, MIN_REPLY_TOKENS } from './ollama-context.js'
import { stripThink } from './think-tags.js'
import { postOllama } from './ollama-post.js'
import { checkReply, tooLong } from './ollama-reply.js'
import { WEB_TOOLS, RESULT_CHARS, runWebTool } from './ollama-web-tools.js'
import { keepSeenSources } from './ollama-web-sources.js'

// A web call to Ollama: the model runs on this computer and asks for
// searches, which ollama-web-tools.js runs through the local server's proxy
// to ollama.com, then answers from what came back. The loop Ollama's own
// docs describe (docs.ollama.com/capabilities/web-search): /api/chat with the
// tools, each call it hands back run and its result added as a "tool"
// message, until it answers without asking for one. The sources a JSON
// answer cites are then held to the pages that came back
// (ollama-web-sources.js); prose, which no web caller asks for today, is
// handed back as it is.
//
// What leaves the machine is only what the model puts in a search query or
// a page address. The web callers build the prompt from the question and a
// posting's public fields (chat/web-prompt.js, actions/fake-check-
// prompt.js), the same rule every CLI's web call keeps, so nothing personal
// is there to put in one beyond the check's saved preferences about
// checking jobs, which it is told to search for, never to search with.
//
// Bounded, so a model that keeps searching cannot run the call to its
// timeout: after MAX_TOOL_CALLS tools or MAX_TURNS turns it is asked once
// more without the tools, and held to JSON when the feature reads JSON,
// which it is not while it may still call a tool, since that shape would
// leave it no way to write the call. The context is sized once for the
// prompt and every result the loop allows, so the model loads only once.
const MAX_TOOL_CALLS = 8
const MAX_TURNS = 6

// A small local model told to search in the prompt alone answered from
// memory instead (measured: qwen3:8b, thinking off, no tool call at all), so
// the tools are named in a system message too, and a first turn that still
// searched for nothing is asked, once, to search first.
const SEARCH_FIRST = 'You have two tools: web_search, and web_fetch to open a page. Search before you answer, '
  + 'answer only from what they return, and cite only pages they returned.'
const SEARCH_NOW = 'Search the web with web_search first, then answer from what it returns.'

const SIGNED_OUT = 'ollama.com did not accept its sign-in for the web search'
const CLOUD_OFF = 'Ollama\'s cloud features are turned off, and its web search goes through them. '
  + 'Turn them back on, or pick another AI in Settings.'
const SPENT = 'Not run: this question has used all its searches. Answer from what you have.'

export async function requestOllamaWeb({ prompt, json, model, signal, http, env }, provider) {
  const { promptTokens, numCtx, numPredict } = contextFor(prompt, model.contextLength, MAX_TOOL_CALLS * RESULT_CHARS)
  if (numPredict < MIN_REPLY_TOKENS) throw new ProviderError('failed', provider, tooLong(model, promptTokens))
  const origin = ollamaOrigin(env)
  const post = (path, body) => postOllama(http, { url: `${origin}${path}`, body, signal }, provider)
  const messages = [{ role: 'system', content: SEARCH_FIRST }, { role: 'user', content: prompt }]
  const seen = []
  let calls = 0
  for (let turn = 1; ; turn += 1) {
    const last = turn >= MAX_TURNS || calls >= MAX_TOOL_CALLS
    const res = await post('/api/chat', {
      model: model.id, messages, stream: false, think: false,
      ...(last ? json && { format: 'json' } : { tools: WEB_TOOLS }),
      options: { num_ctx: numCtx, num_predict: numPredict },
    })
    checkReply(res, model, numCtx, provider)
    const message = res.body?.message ?? {}
    const wanted = Array.isArray(message.tool_calls) ? message.tool_calls : []
    const text = stripThink(typeof message.content === 'string' ? message.content : '')
    if (!last && !wanted.length && turn === 1) {
      messages.push({ role: 'assistant', content: text }, { role: 'user', content: SEARCH_NOW })
      continue
    }
    if (last || !wanted.length) return json ? keepSeenSources(text, seen) : text
    messages.push({ role: 'assistant', content: message.content ?? '', tool_calls: wanted })
    for (const call of wanted) {
      calls += 1
      const out = calls <= MAX_TOOL_CALLS ? await runWebTool(call, (path, body) => toolPost(post, path, body, provider))
        : { name: String(call?.function?.name ?? ''), content: SPENT, urls: [] }
      seen.push(...out.urls)
      messages.push({ role: 'tool', tool_name: out.name, ...(call?.id && { tool_call_id: call.id }), content: out.content })
    }
  }
}

// Signed out since detection, or cloud features turned off: no later search
// in this call would fare better, and another AI might answer instead (see
// fallback.js), so the call stops here.
async function toolPost(post, path, body, provider) {
  const res = await post(path, body)
  if (res.status === 401) throw new ProviderError('login', provider, SIGNED_OUT)
  if (res.status === 403) throw new ProviderError('not_found', provider, CLOUD_OFF)
  return res
}
