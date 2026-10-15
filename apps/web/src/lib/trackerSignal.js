// "The Tracker changed elsewhere": a mail sent from the chat moved or made
// an entry (see the server's store tracker-mail.js), and a Tracker page on
// screen beside the chat reads its entries again rather than showing the
// list from before the mail went.
const EVENT = 'jobdekho:tracker-changed';

export function trackerChanged() {
  globalThis.dispatchEvent?.(new CustomEvent(EVENT));
}

export function onTrackerChanged(handler, view = globalThis) {
  view?.addEventListener?.(EVENT, handler);
  return () => view?.removeEventListener?.(EVENT, handler);
}
