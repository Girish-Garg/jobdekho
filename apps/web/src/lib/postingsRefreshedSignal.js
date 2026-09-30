// Postings refreshed from the app, broadcast the way proposalAppliedSignal.js
// broadcasts an applied proposal. The control that watched the refresh end
// sits in the feed's header or on Settings, the rows it changed are read by
// usePostingsFeed.js, and the two never share a parent; the feed listens and
// reads its page again.
//
//   { fresh, total, tooOld, removed, failed }  what the run found, or null
//                                              when it did not finish
const EVENT = 'jobdekho:postings-refreshed';

export function announceRefreshed(result) {
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: result ?? null }));
}

export function onRefreshed(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}
