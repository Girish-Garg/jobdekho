import { pageOf } from './page.js'
import { assembleChatContext } from './context.js'
import { profilePageContext, resumePageContext, settingsPageContext } from './context-pages.js'

// Everything the chat's first call may know, for the page it was asked
// from. The feed's context is the one it always had (see context.js); the
// profile and resume pages carry the whole career record, since changing
// it is what they are for; settings carries only what setting up needs.
//
// None of this ever reaches the web search, which is handed the question
// alone (see run.js and web-prompt.js). Only the feed's context holds an
// `open` posting, the one public thing that search may see.
export async function assemblePageContext({ dashboard, documents, detect, userId, body = {}, question = '', locate }) {
  const page = pageOf(body.page)
  if (page === 'profile') return { page, ...(await profilePageContext(dashboard, userId)) }
  if (page === 'resume') return { page, ...(await resumePageContext(dashboard, documents, userId, body.documentId)) }
  if (page === 'settings') return { page, ...(await settingsPageContext(dashboard, detect, userId, { locate })) }
  const { filters, sort, openPostingId } = body
  return { page, ...(await assembleChatContext(dashboard, userId, { filters, sort, openPostingId, question })) }
}
