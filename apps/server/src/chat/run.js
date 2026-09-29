import { toIso } from '@jobdekho/store/timestamp.js'
import { callWithFallback } from '../ai/fallback.js'
import { ProviderError } from '../ai/errors.js'
import { buildChatPrompt } from './prompt.js'
import { parseChatReply } from './parse.js'
import { answerFromWeb } from './web-answer.js'

// This call carries the career record (see prompt-profile.js), so like
// cover-letter.js and resume-tailor.js it runs under the 'none' tool policy -
// no web, no filesystem - and gets the same generous ceiling
// resume-tailor.js uses for a similarly sized prompt.
const TIMEOUT_MS = 3 * 60 * 1000

// One turn of the conversation, from prompt to the record the store keeps
// (see packages/store/src/chat-history.js). Fails the way every other AI
// action here does: an absent or signed-out CLI as the ProviderError
// callProvider raised, or a reply parse() cannot read as 'unreadable'.
//
// When the answer needs the web, the record-reading call says so and a
// second call searches with the question alone (see web-prompt.js). A
// search that fails leaves the first answer standing with the reason beside
// it: a question answered from the record beats an error in its place.
export async function runChatTurn({ message, context, history, select, emit, ...seams }) {
  const prompt = buildChatPrompt({ message, context, history })
  const { provider, text } = await callWithFallback({ select, policy: 'none', prompt, timeoutMs: TIMEOUT_MS, emit, ...seams })
  const parsed = parseChatReply(text, context)
  if (!parsed) throw new ProviderError('unreadable', provider)
  const { reply, actions, refs, web } = parsed
  const turn = { question: message, answer: reply, actions, refs, provider: provider.id }
  const searched = web ? await searchFor({ message, history, open: context.open, select, emit, seams }) : {}
  return { ...turn, ...searched, createdAt: toIso(new Date()) }
}

// The web answer replaces the first one whole, refs and actions included:
// both belonged to an answer that is no longer shown.
async function searchFor({ message, history, open, select, emit, seams }) {
  try {
    const found = await answerFromWeb({ message, history, open, select, emit, ...seams })
    return { answer: found.reply, sources: found.sources, web: true, actions: [], refs: [], provider: found.provider }
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err
    return { webError: err.message }
  }
}
