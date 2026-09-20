// Which posting sits open beside the feed, broadcast the way lib/toast.js
// broadcasts a notice. useOpenPosting.js keeps owning the state - this only
// tells anyone else listening what it currently is, which is what lets the
// chat panel mention the open posting without Shell growing a bridge between
// two features that otherwise never talk to each other, and without the
// panel refactoring where that state lives.
const EVENT = 'jobdekho:open-posting';

// Read by a listener that mounts after the id was last announced (the chat
// panel opening onto a feed that already has a posting open), not only by
// one that was already listening when it changed.
let current = null;

export function announceOpenPosting(id) {
  current = id;
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: id }));
}

export function currentOpenPostingId() {
  return current;
}

export function onOpenPostingChange(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}
