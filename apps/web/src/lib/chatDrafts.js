import { useSyncExternalStore } from 'react';

// Each chat's draft, kept in the browser under one key as a map from chat id
// to text, so a half-written question about one job never follows the
// person into the next, and it outlasts switching chats, closing the panel
// and a reload. A chat not made yet keeps its draft under "job:<id>" or
// "document:<id>", the id it is asked by, until it exists (see moveDraft).
const KEY = 'jobdekho-chat-drafts';
let cache = null;
const listeners = new Set();

function read() {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? 'null');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

const all = () => {
  cache ??= read();
  return cache;
};

const without = (map, key) => Object.fromEntries(Object.entries(map).filter(([id]) => id !== key));

function save(next) {
  cache = next;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be locked down; a draft that does not persist is still
    // this page's draft.
  }
  listeners.forEach((listener) => listener());
}

export const draftOf = (id) => (id ? all()[id] ?? '' : '');

// An empty draft is no entry at all, so the map only ever holds typing.
export function setDraft(id, text) {
  if (!id || draftOf(id) === text) return;
  save(text ? { ...all(), [id]: text } : without(all(), id));
}

// A placeholder's draft, once its chat is made, goes under the real id. The
// newer typing is under the placeholder: nobody types into a chat by an id
// it no longer goes by.
export function moveDraft(from, to) {
  const text = draftOf(from);
  if (!text || !to || from === to) return;
  save({ ...without(all(), from), [to]: text });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// [text, setText] for one chat's draft, kept up to date when it changes
// from elsewhere (Edit question, a move to the real id).
export function useDraft(id) {
  const text = useSyncExternalStore(subscribe, () => draftOf(id));
  return [text, (next) => setDraft(id, next)];
}

// Tests start each case with no drafts.
export function resetChatDrafts() {
  cache = null;
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    // Nothing kept, nothing to clear.
  }
}
