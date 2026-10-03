// A chat opened from outside the panel (a notice that an answer is ready,
// "Show in the chat" on the Resume page), broadcast the way askAiSignal.js
// broadcasts the pane's ask, so Shell can open the panel on it without a
// bridge between the two (see useChatDock.js).
const EVENT = 'jobdekho:open-chat';

export function announceOpenChat(id) {
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: id }));
}

export function onOpenChat(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}
