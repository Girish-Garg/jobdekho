// Which posting sits open beside the feed, broadcast the way lib/toast.js
// broadcasts a notice. useOpenPosting.js keeps owning the state - this only
// tells anyone else listening what it currently is, which is what lets the
// chat panel follow the open posting without Shell growing a bridge between
// two features that otherwise never talk to each other, and without the
// panel refactoring where that state lives.
//
// The posting itself travels, not only its id: the chat names the job it is
// scoped to (title, company) and decides whether to offer the "is it real?"
// check from it, and it has no feed of its own to look the id up in.
const EVENT = 'jobdekho:open-posting';
const REQUEST = 'jobdekho:open-posting-request';

// Read by a listener that mounts after the posting was last announced (the
// chat panel opening onto a feed that already has a posting open), not only
// by one that was already listening when it changed.
let current = null;

export function announceOpenPosting(posting) {
  current = posting ?? null;
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: current }));
}

export function currentOpenPosting() {
  return current;
}

export function onOpenPostingChange(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}

// The other direction: the chat asking the feed to open a posting it named.
// Only a request - the feed decides, since only it knows whether that row is
// loaded under the filters on screen right now.
export function requestOpenPosting(id) {
  globalThis.dispatchEvent?.(new CustomEvent(REQUEST, { detail: id }));
}

export function onOpenPostingRequest(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(REQUEST, listener);
  return () => view?.removeEventListener?.(REQUEST, listener);
}
