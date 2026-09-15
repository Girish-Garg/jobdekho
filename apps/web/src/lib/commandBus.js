// Cross-boundary bridge for the one piece of feed state the command palette
// needs to change but does not own: the sort. The palette lives in the
// chrome and PostingsView holds the sort in local state, so rather than Shell
// reaching into that state (which would mean editing PostingsView), a
// request goes out over a plain DOM event and PostingsHeader, which already
// receives the real setSort as a prop, forwards it on arrival.
const SORT_EVENT = 'jobdekho:command-sort';

export function requestSort(value) {
  window.dispatchEvent(new CustomEvent(SORT_EVENT, { detail: value }));
}

// Returns a no-op unsubscribe when there is no handler yet, so a caller can
// wire this up before its setter is ready without a null check at every use.
export function onSortRequest(handler) {
  if (!handler) return () => {};
  const listener = (event) => handler(event.detail);
  window.addEventListener(SORT_EVENT, listener);
  return () => window.removeEventListener(SORT_EVENT, listener);
}
