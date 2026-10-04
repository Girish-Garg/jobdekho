// A posting whose description was fetched on opening (see postingDetails.js),
// broadcast the way postingsRefreshedSignal.js broadcasts a refresh. The
// pane asked for it and the feed holds the row, tagged before there was any
// text to read, and the two never share a parent: the feed listens and
// takes the new tags into that row (see usePostingsFeed.js).
const EVENT = 'jobdekho:posting-described';

export function announceDescribed(posting) {
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: posting ?? null }));
}

export function onDescribed(handler, view = globalThis) {
  const listener = (event) => event.detail && handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}
