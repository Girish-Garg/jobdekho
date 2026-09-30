import { randomUUID } from 'node:crypto'
import { toIso } from '@jobdekho/store/timestamp.js'
import { callWithFallback } from '../ai/fallback.js'
import { ProviderError } from '../ai/errors.js'
import { buildChatPrompt } from './prompt.js'
import { parseChatReply } from './parse.js'
import { answerFromWeb } from './web-answer.js'
import { replyStream } from './reply-stream.js'

// This call carries the career record (see prompt-profile.js and
// prompt-pages.js), so like cover-letter.js and resume-tailor.js it runs
// under the 'none' tool policy - no web, no filesystem - and gets the same
// generous ceiling resume-tailor.js uses for a similarly sized prompt. On
// the resume page a document change is usually a few edits, but a new
// document or a restyle is a whole .tex file, a long answer to write, so
// that page gets longer.
const TIMEOUT_MS = 3 * 60 * 1000
const LONG_REPLY_MS = 5 * 60 * 1000

// One turn of the conversation, from prompt to the record the store keeps
// (see packages/store/src/chat-history.js):
//
//   { id, page, question, answer, actions, refs, proposals, provider, createdAt, web?, webError? }
//
// Fails the way every other AI action here does: an absent or signed-out
// CLI as the ProviderError callProvider raised, or a reply parse() cannot
// read as 'unreadable'. Proposals are validated here and stored pending;
// nothing they describe happens until the person applies one (see
// apply-proposal.js).
//
// When the answer needs the web, the record-reading call says so and a
// second call searches with the question alone (see web-prompt.js). Its
// answer is added after the first, never in place of it: what JobDekho holds
// comes first, and "is Razorpay hiring?" answered only from the web hid the
// ten Razorpay openings JobDekho had. A search that fails leaves the reason
// beside the first answer. The search never sees the career record or a
// document on any page: only the feed's context has an `open` posting, the
// one public thing it may be given.
//
// The reply streams as it is written (see reply-stream.js), and `signal`
// stops the call where it is: a stop during the search keeps the answer
// already given and says the search did not finish.
export async function runChatTurn({ message, context, history, select, emit, signal = null, ...seams }) {
  const prompt = buildChatPrompt({ message, context, history })
  const timeoutMs = context.page === 'resume' ? LONG_REPLY_MS : TIMEOUT_MS
  const onText = replyStream(emit)
  const { provider, text } = await callWithFallback({ select, policy: 'none', prompt, timeoutMs, emit, signal, onText, ...seams })
  onText.flush()
  const parsed = parseChatReply(text, context)
  if (!parsed) throw new ProviderError('unreadable', provider)
  const { reply, actions, refs, proposals, web } = parsed
  const turn = {
    id: randomUUID(), page: context.page ?? 'postings', question: message, answer: reply, actions, refs, proposals, provider: provider.id,
  }
  const open = context.page === undefined || context.page === 'postings' ? context.open : null
  const searched = web ? await searchFor({ message, history, open, select, emit, signal, seams }) : {}
  return { ...turn, ...searched, createdAt: toIso(new Date()) }
}

const STOPPED_SEARCH = 'You stopped the web search, so this is JobDekho\'s own answer alone.'

async function searchFor({ message, history, open, select, emit, signal, seams }) {
  try {
    const found = await answerFromWeb({ message, history, open, select, emit, signal, ...seams })
    return { web: { answer: found.reply, sources: found.sources, provider: found.provider } }
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err
    return { webError: err.kind === 'stopped' ? STOPPED_SEARCH : err.message }
  }
}
