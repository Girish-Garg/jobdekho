import { touchChat } from '@jobdekho/store/chats.js'
import { ProviderError } from '../ai/errors.js'
import { progressEvent } from '../ai/events.js'
import { coverLetter } from '../actions/cover-letter.js'
import { runAction } from '../actions/run.js'
import { noteEvent, stopSignal } from './in-flight.js'
import { jobChat } from './chat-lookup.js'
import { saveTurn, combinedTurn } from './save-turn.js'
import { LETTERS_EACH, lettersLabel } from './busy.js'

// Past one of these the next letter would fail the same way: the person
// stopped it, or no AI can be reached at all.
const ENDS_THE_RUN = new Set(['stopped', 'not_found', 'login'])
const GONE = 'JobDekho no longer lists this job.'

// One letter, saved with its own job and shown in that job's chat. The
// chat is found after the call, so one deleted meanwhile is made anew
// rather than the letter landing in no chat.
async function oneLetter(deps, { userId, posting, context, emit }) {
  const record = await runAction(coverLetter, { posting, context, select: deps.select, emit, signal: stopSignal(userId), ...deps.cli })
  const own = await jobChat(deps, userId, posting)
  await deps.dashboard.setAiResult(userId, { ...record, chatId: own.id })
  await touchChat(deps.store, userId, own.id)
  return { chatId: own.id, provider: record.provider }
}

const summary = (written, total) => (written === total
  ? `Wrote ${total} cover letters, each saved with its job, in that job's chat.`
  : `Wrote ${written} of ${total} cover letters, each saved with its job, in that job's chat. The card says what stopped the rest.`)

// "Cover letter for each": one letter per compared job, written one after
// another inside the one call slot the route holds, each announced as it
// starts ("Cover letter 2 of 3") on the stream and on the busy call. The
// comparison gets one card listing them, each linking to its job's chat:
//
//   letters: [{ postingId, title, company, status: 'written' | 'failed' | 'skipped', chatId?, error? }]
//
// When not one letter was written it fails as the failure that ended the
// run did, or else as its first one.
export async function lettersForEach(deps, { userId, chat, context, emit = () => {} }) {
  const watch = (event) => { noteEvent(userId, event); emit(event) }
  const letters = []
  let failure = null
  let provider = null
  for (const [i, postingId] of chat.jobs.entries()) {
    const posting = await deps.dashboard.getPosting(userId, postingId)
    const named = { postingId, title: posting?.title ?? null, company: posting?.company ?? null }
    if (!posting || ENDS_THE_RUN.has(failure?.kind)) {
      letters.push({ ...named, status: 'skipped', error: posting ? failure.message : GONE })
      continue
    }
    const label = lettersLabel(i + 1, chat.jobs.length)
    watch(progressEvent({ stage: 'letter', index: i + 1, total: chat.jobs.length, postingId, label }))
    try {
      const written = await oneLetter(deps, { userId, posting, context, emit: watch })
      provider = written.provider
      letters.push({ ...named, status: 'written', chatId: written.chatId })
    } catch (err) {
      if (!(err instanceof ProviderError)) throw err
      failure ??= err
      if (ENDS_THE_RUN.has(err.kind)) failure = err
      letters.push({ ...named, status: 'failed', error: err.message })
    }
  }
  const written = letters.filter((letter) => letter.status === 'written').length
  if (!written && failure) throw failure
  const turn = combinedTurn(chat, {
    question: LETTERS_EACH, answer: summary(written, letters.length), provider, combined: { kind: 'letters-each', letters },
  })
  return { ...turn, chatId: await saveTurn(deps.store, userId, chat.id, turn) }
}
