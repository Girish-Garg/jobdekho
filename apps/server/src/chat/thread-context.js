import { pageOf } from './page.js'
import { assembleChatContext, chatBasics } from './context.js'
import { profilePageContext, resumePageContext, settingsPageContext } from './context-pages.js'
import { chatItemsContext } from './chat-items-context.js'

// Everything a chat's question may know: what the chat holds, the same on
// every page (see chat-items-context.js), and what the page it was asked
// from holds: the profile and resume pages carry the whole career record,
// since changing it is what they are for, and settings only what setting
// up needs.
//
// Only a general chat is shown the feed. A job's chat, a document's and a
// comparison are about what they hold, and a screenful of other jobs would
// only crowd it.
//
// None of this ever reaches the web search, which is handed the question
// alone and, in a job's own chat, that job's public fields (see run.js and
// web-prompt.js).
async function pagePart(page, { chat, dashboard, documents, detect, userId, body, question, locate }) {
  if (page === 'profile') return profilePageContext(dashboard, userId)
  if (page === 'resume') return resumePageContext(dashboard, documents, userId)
  if (page === 'settings') return settingsPageContext(dashboard, detect, userId, { locate })
  if (chat.kind !== 'general') return chatBasics(dashboard, userId)
  return assembleChatContext(dashboard, userId, { filters: body.filters, sort: body.sort, question })
}

export async function assembleThreadContext({ chat, history = [], dashboard, documents, detect, userId, body = {}, question = '', locate }) {
  const page = pageOf(body.page)
  const items = await chatItemsContext({ chat, history, dashboard, documents, userId })
  const base = await pagePart(page, { chat, dashboard, documents, detect, userId, body, question, locate })
  return { page, chatKind: chat.kind, ...base, ...items }
}
