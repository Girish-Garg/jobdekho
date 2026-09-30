// Who holds the wheel in an Apply session, as a small closed machine:
//
//   starting  the browser is opening the posting
//   filling   JobDekho is setting values; the person's first press stops it
//   yours     the person drives, for a reason (a sign-in, a code, a human
//             check, a page to check, or because they took over)
//   review    the page has the site's submit button: the person reviews and
//             submits it themselves
//   closed    the browser is gone
//
// Only a press moves it back to `filling`; nothing JobDekho sees on a page
// (a password field gone, a new page loaded) resumes filling on its own.
const EDGES = {
  starting: ['filling', 'yours', 'review', 'closed'],
  filling: ['yours', 'review', 'closed'],
  yours: ['filling', 'yours', 'review', 'closed'],
  review: ['filling', 'yours', 'review', 'closed'],
  closed: [],
}

export function moveTo(session, state, reason = null) {
  if (!EDGES[session.state]?.includes(state)) {
    throw new Error(`An Apply session cannot go from ${session.state} to ${state}`)
  }
  session.state = state
  session.reason = reason
}

export const canFill = (session) => session.state === 'filling' && !session.closing

// Whether the person's own input goes through to the page.
export const personDrives = (session) => (session.state === 'yours' || session.state === 'review') && !session.closing
