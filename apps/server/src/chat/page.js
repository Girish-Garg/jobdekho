// The page the chat is asked from, which decides what the model is shown
// (see thread-context.js) and what it may propose (see proposals.js). Taken
// from the client, and safe to take: it only chooses which of the person's
// own records to read, and anything unknown reads as the feed, the page the
// chat has always known.
export const PAGES = ['postings', 'profile', 'resume', 'settings']

export const pageOf = (value) => (PAGES.includes(value) ? value : 'postings')
