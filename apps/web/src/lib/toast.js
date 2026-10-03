// Where something gone wrong gets said out loud. Until now a failure only
// ever appeared inline, next to the control that caused it, which works when
// you are looking at that control and not at all when you are not: a CLI that
// is signed out, a save that did not save, a scrape route that answered 500.
//
// One channel, so every part of the app reports trouble the same way and the
// host (ToastHost.jsx) is the only thing that decides how it looks.
const EVENT = 'jobdekho:notice';

// Errors are the reason this exists; "done" is here so a save can confirm
// itself without inventing a second mechanism.
export const KINDS = ['error', 'done'];

let nextId = 0;

// `detail` is shown as written: the server's sentences are meant to be read
// by the person, not summarised (see apps/server/src/ai/errors.js). `link`
// is { label, onClick }, a way to what the notice is about: an answer that
// landed in a chat nobody had open names that chat and opens it.
export function notify({ title, detail = '', kind = 'error', action = null, link = null }) {
  const notice = { id: (nextId += 1), title, detail, kind: KINDS.includes(kind) ? kind : 'error', action, link };
  globalThis.dispatchEvent?.(new CustomEvent(EVENT, { detail: notice }));
  return notice;
}

// An Error carries the sentence in `message`, and a ProviderError also
// carries a `kind` saying which action fixes it (see ai/errors.js) - both
// travel to the browser as the same plain { error, kind } body (see
// lib/request.js's failure()), with nothing on the wire to say which server
// module raised it. LatexError (apps/server/src/resume/errors.js) reuses the
// very same kind strings for an unrelated fix - installing LaTeX, not an AI
// CLI - so only a caller that knows its own call is an AI action may pass
// `actionable: true` to let `kind` become a button; every other caller gets
// the sentence with no button rather than one offering the wrong fix.
export function notifyError(error, title = 'Something went wrong', { actionable = false } = {}) {
  return notify({
    title,
    detail: error?.message ?? String(error ?? ''),
    kind: 'error',
    action: actionable ? (error?.kind ?? null) : null,
  });
}

export function onNotice(handler, view = globalThis) {
  const listener = (event) => handler(event.detail);
  view?.addEventListener?.(EVENT, listener);
  return () => view?.removeEventListener?.(EVENT, listener);
}
