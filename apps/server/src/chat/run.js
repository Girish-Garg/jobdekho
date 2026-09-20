import { toIso } from '@jobdekho/store/timestamp.js'
import { callWithFallback } from '../ai/fallback.js'
import { ProviderError } from '../ai/errors.js'
import { buildChatPrompt } from './prompt.js'
import { parseChatReply } from './parse.js'

// This call carries the career record (see prompt-profile.js), so like
// cover-letter.js and resume-tailor.js it runs under the 'none' tool policy -
// no browser, no filesystem - and gets the same generous ceiling
// resume-tailor.js uses for a similarly sized prompt.
const TIMEOUT_MS = 3 * 60 * 1000

// One turn of the conversation, from prompt to the record the store keeps
// (see packages/store/src/chat-history.js). Fails the way every other AI
// action here does: an absent or signed-out CLI as the ProviderError
// callProvider raised, or a reply parse() cannot read as 'unreadable'.
export async function runChatTurn({ message, context, history, select, emit, ...seams }) {
  const prompt = buildChatPrompt({ message, context, history })
  const { provider, text } = await callWithFallback({ select, policy: 'none', prompt, timeoutMs: TIMEOUT_MS, emit, ...seams })
  const parsed = parseChatReply(text)
  if (!parsed) throw new ProviderError('unreadable', provider)
  return { question: message, answer: parsed.reply, actions: parsed.actions, provider: provider.id, createdAt: toIso(new Date()) }
}
