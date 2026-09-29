// Which document is open in the Resume workspace, broadcast the way
// openPostingSignal.js broadcasts the open posting, so the chat can send its
// id with every question asked there and name it above the conversation.
// Only { id, name, kind } travels: the server reads the source itself.
const EVENT = 'jobdekho:open-document';
const REQUEST = 'jobdekho:open-document-request';

// Kept for a listener that mounts after the last announcement: the chat
// opening onto a workspace that already has a document open.
let current = null;

export function announceOpenDocument(doc) {
  current = doc ? { id: doc.id, name: doc.name, kind: doc.kind } : null;
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: current }));
}

export function currentOpenDocument() {
  return current;
}

export function onOpenDocumentChange(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}

// The other direction: the chat made a document (a tailored resume) and
// asks the workspace to open it. The workspace is usually not mounted yet
// when this is asked, since asking is what takes the person there, so the
// id waits here until a workspace takes it.
let wanted = null;

export function requestOpenDocument(id) {
  wanted = id;
  globalThis.dispatchEvent?.(new CustomEvent(REQUEST, { detail: id }));
}

export function takeOpenRequest() {
  const id = wanted;
  wanted = null;
  return id;
}

export function onOpenDocumentRequest(handler, view = globalThis) {
  const listener = () => handler();
  view?.addEventListener?.(REQUEST, listener);
  return () => view?.removeEventListener?.(REQUEST, listener);
}
