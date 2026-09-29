// "Add with AI" on the Profile page: open the chat with the start of a
// request already in the box ("Add a project: "), for the person to finish
// in their own words. Broadcast like askAiSignal.js, since the buttons sit
// deep in the record and the chat beside it in Shell. Shell listens so it
// can open the panel; the box reads the draft it is handed.
const EVENT = 'jobdekho:chat-draft';

let nextId = 0;
// The newest draft a box has already taken. Shell keeps the last one while
// the chat stays open, and a box that remounts must not put it back after
// the person has cleared or sent it.
let taken = 0;

export function startChatDraft(text) {
  nextId += 1;
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: { id: nextId, text: String(text ?? '') } }));
}

export function onChatDraft(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}

// True exactly once per draft, whichever box asks first.
export function takeDraft(draft) {
  if (!draft || draft.id <= taken) return false;
  taken = draft.id;
  return true;
}
