// Companies just blocked, broadcast the way postingsRefreshedSignal.js
// broadcasts a finished refresh. A block starts in the job pane or in a chat
// answer, and what it changes sits elsewhere: the feed reads its page again
// (see usePostingsFeed.js), and the chat lets go of a job it was scoped to
// (see useChatScope.js). The detail is every name the companies go by here:
// the one each block was asked for and the one it is kept under, which differ
// when another spelling of the company was blocked first.
const EVENT = 'jobdekho:companies-blocked';

export function announceBlocked(names) {
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: names ?? [] }));
}

export function onBlocked(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}
