// Each chat's one waiting follow-up: a question typed while that chat's
// answer was still running, sent as soon as the answer is in (see
// drain.js). Held here rather than in the browser, so it survives the panel
// closing and the page reloading, and it is sent even when nobody is
// watching. A second one replaces the first. In memory only: a restart
// drops it, as it drops the call it was waiting on.
//
//   { message, body, at }, where `body` is the rest of what the question
//   was asked with (the page, the feed's filters and sort)
const waiting = new Map()

const mine = (userId) => waiting.get(userId) ?? waiting.set(userId, new Map()).get(userId)

export function setFollowUp(userId, chatId, { message, body = {} }, now = Date.now()) {
  const followUp = { message, body, at: new Date(now).toISOString() }
  mine(userId).set(chatId, followUp)
  return followUp
}

export const clearFollowUp = (userId, chatId) => mine(userId).delete(chatId)

// The chat's follow-up, taken: whoever takes it sends it.
export function takeFollowUp(userId, chatId) {
  const followUp = mine(userId).get(chatId) ?? null
  mine(userId).delete(chatId)
  return followUp
}

// What the browser is told of each chat's follow-up, by chat id: the words
// and when they were queued.
export const followUpsOf = (userId) => Object.fromEntries([...mine(userId)].map(([chatId, { message, at }]) => [chatId, { message, at }]))
