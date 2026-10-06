import { useSyncExternalStore } from 'react';
import { onOpenPostingChange } from './openPostingSignal.js';
import { onOpenDocumentChange } from './openDocumentSignal.js';
import { announceOpenChat } from './openChatSignal.js';
import { readSavedChat, saveChat } from './savedChat.js';
import { sameChat } from './chatStore.js';

export { onOpenChat } from './openChatSignal.js';

// Which chat is on screen, kept for the life of the page so the panel opens
// where it was left. It follows what the person is looking at: on the feed
// the job open in the pane, on the Resume page the open document, each shown
// in its own chat; closing the pane goes back to the chat on screen before
// it opened one. Other pages keep the chat on screen. With the pin on,
// nothing moves the chat but the person.
//
//   base    the chat the person chose, or was on when they left a page
//   follow  { type, id }: the job or document whose chat is shown for it
//   before  the chat to go back to when what is followed closes
//   seen    the job and the document last seen open, so a repeat is no change
const FOLLOWS = { postings: 'job', resume: 'document' };

const fresh = () => ({ base: readSavedChat(), follow: null, before: null, seen: {}, pinned: false, page: 'postings' });
let state = fresh();
const listeners = new Set();

export const chatIdOf = (s) => (s.follow ? `${s.follow.type}:${s.follow.id}` : s.base);
export const onScreenId = () => chatIdOf(state);
export const followsOn = (page) => FOLLOWS[page] ?? null;

function set(patch) {
  const next = { ...state, ...patch };
  if (next.base !== state.base) saveChat(next.base);
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const useOnScreen = () => useSyncExternalStore(subscribe, () => state);

// The pane or the Resume page showing a job or a document, or none (null).
function opened(type, item) {
  const id = item?.id ?? null;
  if (type in state.seen && (state.seen[type]?.id ?? null) === id) return;
  const seen = { ...state.seen, [type]: item ?? null };
  if (followsOn(state.page) !== type || state.pinned) return set({ seen });
  if (id) return set({ seen, follow: { type, id }, before: state.follow?.type === type ? state.before : chatIdOf(state) });
  if (state.follow?.type !== type) return set({ seen });
  set({ seen, base: state.before ?? state.base, follow: null, before: null });
}

onOpenPostingChange((posting) => opened('job', posting));
onOpenDocumentChange((doc) => opened('document', doc));

// Leaving a page lets go of what it followed and puts back the chat on
// screen before it followed anything, as closing the pane does: a job or a
// document the person is no longer looking at is no longer what the chat is
// about. Kept, it stayed on every page after ("Classic resume" on the feed
// with nothing open), and in the next session too. With the pin on, nothing
// moves. Arriving forgets what that page showed last, so it is followed again.
export function setPage(page) {
  if (state.page === page) return;
  const type = followsOn(page);
  const seen = type ? Object.fromEntries(Object.entries(state.seen).filter(([key]) => key !== type)) : state.seen;
  const release = state.follow && state.follow.type !== type;
  set({ page, seen, ...(release ? { base: state.before ?? state.base, follow: null, before: null } : {}) });
}

// The person chose a chat. The one already on screen, followed or not, stays
// as it is.
export function pick(id) {
  if (!id || sameChat(chatIdOf(state), id)) return;
  set({ base: id, follow: null, before: null });
}

export function setPinned(on) {
  set(on ? { pinned: true, base: chatIdOf(state), follow: null, before: null } : { pinned: false });
}

// From anywhere (a notice, the Resume page): this chat, in the panel, opened.
export function openChat(id) {
  pick(id);
  announceOpenChat(id);
}

// Tests start each case on the feed with nothing chosen.
export function resetActiveChat() {
  saveChat(null);
  state = fresh();
}
