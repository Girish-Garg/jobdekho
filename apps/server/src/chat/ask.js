import { getChatMessages } from '@jobdekho/store/chat-messages.js'
import { assembleThreadContext } from './thread-context.js'
import { runChatTurn } from './run.js'
import { chatMemory, settleMemory } from './memory-turn.js'
import { noteEvent, stopSignal } from './in-flight.js'
import { saveTurn } from './save-turn.js'

// The turns a question is asked with: every one that asked something, which
// leaves out the notes a job action started elsewhere leaves behind.
export const askedTurns = (turns) => turns.filter((turn) => typeof turn.question === 'string' && !turn.note)

// One question in one chat, once the one-at-a-time guard has let it run
// (see in-flight.js): the context from what the chat holds and the page it
// was asked from (see thread-context.js), the call, and the turn saved with
// the items the chat held when it was asked. `body` is the rest of the
// request: the page, and the feed's filters and sort. Resolves the turn as
// the browser gets it, with `chatId`, the chat it was saved in.
export async function askInChat(deps, { userId, chat, message, body = {}, emit = () => {} }) {
  const { turns } = await getChatMessages(deps.store, userId, chat.id)
  const history = askedTurns(turns)
  const context = await assembleThreadContext({
    chat, history, dashboard: deps.dashboard, documents: deps.documents, detect: deps.detect, userId, body, question: message,
  })
  // What the person asked the chat to remember, unless they switched memory
  // off (see memory-turn.js).
  context.memory = await chatMemory(deps.store, userId, { page: context.page, message })
  const watch = (event) => { noteEvent(userId, event); emit(event) }
  const asked = await runChatTurn({ message, context, history, select: deps.select, emit: watch, signal: stopSignal(userId), ...deps.cli })
  // Saved now only when the message itself said "remember"; the rest wait
  // under the answer for the person's Save.
  const memory = await settleMemory(deps.store, userId, message, asked.memory)
  const turn = { ...asked, memory, items: { jobs: [...chat.jobs], documents: [...chat.documents] } }
  return { ...turn, chatId: await saveTurn(deps.store, userId, chat.id, turn) }
}
