// What each kind of chat is called in the switcher. A job's chat is named
// for the job, a document's for the document, a comparison for the
// companies it compares, and a general chat for its first question, the way
// a person would name it.
export const NEW_CHAT = 'New chat'
const MAX_TITLE = 80
const DOT = '·'

// The first question on one line, short enough to sit in a row.
export function questionTitle(question) {
  const first = String(question ?? '').replace(/\s+/g, ' ').trim()
  if (!first) return 'A conversation'
  return first.length > MAX_TITLE ? `${first.slice(0, MAX_TITLE - 3).trimEnd()}...` : first
}

// "Frontend Engineer · Razorpay". A job the corpus no longer holds has no
// name to give, so its chat keeps whatever it was called before.
export function jobTitle(posting, fallback = 'A job no longer listed') {
  if (!posting?.title) return fallback
  return posting.company ? `${posting.title} ${DOT} ${posting.company}` : posting.title
}

// "Razorpay vs Writesonic", then "+2" for the rest: the switcher's row has
// room for two names.
export function compareTitle(companies) {
  const names = companies.map((name) => String(name || 'A job'))
  const shown = names.slice(0, 2).join(' vs ')
  return names.length > 2 ? `${shown} +${names.length - 2}` : shown
}
