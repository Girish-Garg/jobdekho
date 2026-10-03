import { getChat } from '@jobdekho/store/chats.js'
import { ProviderError } from '../ai/errors.js'

// What each running call is called where the browser shows it: the thinking
// card, the busy note on every other chat's Send, and the 409 below.
export const ANSWERING = 'Answering'
export const TAILOR_ALL = 'Tailor resume for all'
export const LETTERS_EACH = 'Cover letter for each'
export const ACTION_LABELS = { 'fake-check': 'Is it real?', 'cover-letter': 'Cover letter', 'resume-tailor': 'Tailor resume' }
export const lettersLabel = (index, total) => `Cover letter ${index} of ${total}`

// A question in a document's own chat is mostly a change to that document,
// so it runs as an edit; anywhere else it is a question.
export const callKindOf = (chat) => (chat.kind === 'document' ? 'edit' : 'question')

// The body of the 409 a call gets while another runs: the sentence, and
// which chat is busy, so the browser can say where and link to it.
//
//   { error, busy: { chatId, kind, label, title } }
export function busyBody(call, title) {
  return {
    error: `JobDekho is still working in "${title}" (${call.label}). You can send once it is done.`,
    busy: { chatId: call.chatId, kind: call.kind, label: call.label, title },
  }
}

// The same, with the busy chat's title read from the store.
export async function busyRefusal({ store }, userId, call) {
  return busyBody(call, (await getChat(store, userId, call.chatId))?.title ?? 'another chat')
}

const COULD_NOT = 'The assistant could not answer that question.'

// The sentence a failed call leaves in its chat, or null for none: a stop
// is the person's own doing, not a failure to tell them about. Anything but
// a ProviderError is a bug, reported in words that say nothing of it.
export function failureSentence(err) {
  if (err?.kind === 'stopped') return null
  return err instanceof ProviderError ? err.message : COULD_NOT
}
