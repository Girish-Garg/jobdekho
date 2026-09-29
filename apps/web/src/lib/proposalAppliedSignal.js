// A chat proposal the person applied, broadcast the way lib/toast.js
// broadcasts a notice. The card that applied it sits in the chat, the
// record it changed sits on the Profile page or in the Resume workspace,
// and the two never share a parent below Shell; each page listens and
// adopts what the server saved rather than reading it again.
//
//   { kind: 'profile', profile }   the whole record as saved
//   { kind: 'document', document } the document as saved, with its source
const EVENT = 'jobdekho:proposal-applied';

export function announceApplied(outcome) {
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: outcome }));
}

export function onApplied(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}
