import { useEffect, useSyncExternalStore } from 'react';

// Every chat's state for the life of the page, not of the panel: an answer
// lands whether the panel is open or not, and the job pane's AI buttons and
// the top bar read the one call running too. Kept per chat id, so nothing
// one chat holds can show in another: a thinking card, a result, a failure
// or a draft belongs to the chat it was asked in, never to whichever chat
// happens to be on screen when it lands.
//
//   pages    { [id]: { chat, turns, dropped, results, ticket } }, as the server
//            answers GET messages (see chatPages.js)
//   alias    { 'job:p1': realId }: a job's or a document's chat once it exists
//   list     the switcher's views, undefined until first read
//   busy     the one AI call running, in one chat (see chatCall.js, chatPending.js)
//   waiting  { [id]: { message, at } }: each chat's follow-up, which the server sends
//   failed   { [id]: missed }: the call each chat got no answer to
//   unseen   { [id]: true }: an answer landed there since the person looked
//   gone     { [id]: sentence }: a chat that could not be opened
const EMPTY = { pages: {}, alias: {}, list: undefined, busy: null, waiting: {}, failed: {}, unseen: {}, gone: {} };

let state = EMPTY;
let panels = 0;
// Bumped by a reset, so a read or a call begun before it cannot write into
// the state that replaced it.
let generation = 0;
const listeners = new Set();

export const chatStore = {
  get: () => state,
  set(patch) {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    listeners.forEach((listener) => listener());
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  generation: () => generation,
  // Whether a panel is on screen to show an answer as it lands.
  watched: () => panels > 0,
};

export function useChatStore() {
  return useSyncExternalStore(chatStore.subscribe, chatStore.get);
}

// Mounted by the panel, so an answer landing knows someone is looking.
export function useChatWatcher() {
  useEffect(() => {
    panels += 1;
    return () => { panels -= 1; };
  }, []);
}

// Own entries only, so an id named like an object property ("constructor")
// finds no chat rather than a function (see savedChat.js).
const own = (map, key) => (Object.hasOwn(map, key) ? map[key] : undefined);

// The real id behind a placeholder, once the chat exists.
export const realId = (id, s = state) => (id ? own(s.alias, id) ?? id : null);

export const sameChat = (a, b, s = state) => Boolean(a && b) && realId(a, s) === realId(b, s);

// A map's entry for a chat, under its real id or the id it was asked by.
export const entryFor = (map, id, s = state) => (id ? own(map, realId(id, s)) ?? own(map, id) ?? null : null);

export const pageOf = (id, s = state) => entryFor(s.pages, id, s);

// The chat the one call runs in, when it is this one.
export const busyIn = (id, s = state) => (s.busy && sameChat(s.busy.chatId, id, s) ? s.busy : null);

export const without = (map, ...keys) => Object.fromEntries(Object.entries(map).filter(([key]) => !keys.includes(key)));

// A job's "Title · Company" from any chat this page has read that holds it,
// for naming a call about a job whose own chat was never opened here.
export function jobTitleIn(s, postingId) {
  const views = [...Object.values(s.pages).map((page) => page.chat), ...(s.list ?? [])];
  const job = views.flatMap((view) => view.jobs ?? []).find((one) => one.id === postingId);
  return job ? [job.title, job.company].filter(Boolean).join(' · ') : null;
}

// Tests start each case from an empty store.
export function resetChatStore() {
  state = EMPTY;
  panels = 0;
  generation += 1;
}
