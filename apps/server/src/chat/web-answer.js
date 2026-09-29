import { callWithFallback } from '../ai/fallback.js'
import { ProviderError } from '../ai/errors.js'
import { progressEvent } from '../ai/events.js'
import { buildChatWebPrompt } from './web-prompt.js'
import { parseChatWebReply } from './web-parse.js'

// A few searches, and on Claude Code a page or two opened, take longer than
// reading a prompt; the fake check, which does more of both, gets five.
const TIMEOUT_MS = 4 * 60 * 1000

// The chat's second call, made only when the first said the answer needs the
// web (see run.js). Its own 'web' progress event comes first so the panel can
// say what is happening before the CLI's own events start.
export async function answerFromWeb({ message, history, open, select, emit = () => {}, ...seams }) {
  emit(progressEvent({ stage: 'web' }))
  const prompt = buildChatWebPrompt({ message, history, open })
  const { provider, text } = await callWithFallback({ select, policy: 'web', prompt, timeoutMs: TIMEOUT_MS, emit, ...seams })
  const parsed = parseChatWebReply(text)
  if (!parsed) throw new ProviderError('unreadable', provider)
  return { ...parsed, provider: provider.id }
}
