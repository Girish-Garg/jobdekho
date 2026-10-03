// "Ask AI about this job", from the job pane to the chat. The pane is
// rendered deep inside the feed and the chat beside it in Shell, so this is
// broadcast the way lib/toast.js broadcasts a notice rather than threaded
// through every component in between. Shell listens so it can open the
// panel; the panel reads the request it is handed.
//
// `action` is a posting action kind (see chatActionKinds.js) to start in
// the job's own chat once it is on screen, or null to only open that chat.
const EVENT = 'jobdekho:ask-ai';

let nextId = 0;
// The id of the newest request a panel has already acted on. Shell keeps the
// last request around while the chat stays open, and a panel that remounts
// (the person went to Profile and back) must not start the same check twice.
let taken = 0;

export function askAboutPosting(posting, action = null) {
  nextId += 1;
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: { id: nextId, posting, action } }));
}

export function onAskAboutPosting(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}

// True exactly once per request, whichever panel asks first.
export function takeRequest(request) {
  if (!request || request.id <= taken) return false;
  taken = request.id;
  return true;
}
