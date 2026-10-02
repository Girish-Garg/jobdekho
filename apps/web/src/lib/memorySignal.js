// What the chat remembers changed outside the Profile page's own section:
// a chip saved, undone or edited under a chat answer, or an answer that
// saved one because the message said "remember". Broadcast the way
// proposalAppliedSignal.js broadcasts an applied change, since the chat and
// that section never share a parent below Shell; the section reads the list
// again when it hears this.
const EVENT = 'jobdekho:memory-changed';

export function announceMemoryChanged() {
  globalThis.dispatchEvent?.(new CustomEvent(EVENT));
}

export function onMemoryChanged(handler, view = globalThis) {
  const listener = () => handler();
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}
