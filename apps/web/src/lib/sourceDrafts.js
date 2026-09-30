import { useSyncExternalStore } from 'react';

// The Resume page's unsaved LaTeX drafts, one per document, for as long as
// the page is open. The editor used to keep its draft in the open
// document's own component, so opening another document threw away
// whatever had been typed and not saved; held here, going back to it finds
// the draft exactly as it was left (see useSourceDraft.js).
//
// Each entry is { draft, base }: the text being edited and the saved source
// it started from, which is what tells the editor, on the way back, whether
// the document changed in the meantime. An entry exists only while the two
// differ, so a saved or discarded draft is no draft at all. Nothing is
// written anywhere: a reload is warned about instead (see guard below).
const drafts = new Map();
const listeners = new Set();
let unsaved = [];

// Leaving the page while any draft is unsaved asks first. The listener is
// attached only while there is something to lose, since a page that always
// asks before closing teaches people to click through the question.
function warn(event) {
  event.preventDefault();
  event.returnValue = '';
}

let guarding = false;
function guard() {
  const need = drafts.size > 0;
  if (need === guarding) return;
  guarding = need;
  if (need) globalThis.addEventListener?.('beforeunload', warn);
  else globalThis.removeEventListener?.('beforeunload', warn);
}

// Only which documents have a draft is published: the list marks them, and
// a keystroke in a draft that already exists changes nothing it shows.
function publish() {
  unsaved = [...drafts.keys()];
  guard();
  listeners.forEach((listener) => listener());
}

export const draftFor = (id) => (id ? drafts.get(id) ?? null : null);

export function keepDraft(id, draft, base) {
  if (!id) return;
  const had = drafts.has(id);
  if (draft === base) {
    if (had && drafts.delete(id)) publish();
    return;
  }
  drafts.set(id, { draft, base });
  if (!had) publish();
}

// A deleted document's draft goes with it.
export function dropDraft(id) {
  if (drafts.delete(id)) publish();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The ids of the documents with unsaved edits, for the document list.
export function useUnsavedDocuments() {
  return useSyncExternalStore(subscribe, () => unsaved);
}

// Tests start each case with no drafts and no unload guard.
export function resetSourceDrafts() {
  drafts.clear();
  publish();
}
