import { getChatPage, listChats, markChatSeen } from '../api.js';
import { moveDraft } from './chatDrafts.js';
import { chatStore, realId, without } from './chatStore.js';

// The chats as the server has them: one chat's page, the switcher's list,
// and the person having looked. Every read is numbered when it starts, and
// a page is only ever replaced by a newer read: a read begun before a
// result was saved must not hide that result when it lands late.
let ticket = 0;

// The placeholder a job's or a document's own chat was asked by.
function aliasOf(view) {
  if (!view || view.placeholder) return null;
  if (view.kind === 'job' && view.jobs?.[0]) return [`job:${view.jobs[0].id}`, view.id];
  if (view.kind === 'document' && view.documents?.[0]) return [`document:${view.documents[0].id}`, view.id];
  return null;
}

// Views fresh from the server, wherever the store shows them. A chat that
// now exists takes its placeholder's draft along (see chatDrafts.js).
export function putViews(views) {
  const named = Object.fromEntries(views.map(aliasOf).filter(Boolean));
  Object.entries(named).forEach(([from, to]) => moveDraft(from, to));
  const byId = new Map(views.map((view) => [view.id, view]));
  chatStore.set((s) => ({
    alias: { ...s.alias, ...named },
    pages: Object.fromEntries(Object.entries(s.pages).map(([id, page]) => [id, byId.has(id) ? { ...page, chat: byId.get(id) } : page])),
    list: s.list?.map((row) => byId.get(row.id) ?? row),
  }));
}

export function putPage(page, at = (ticket += 1)) {
  putViews([page.chat]);
  const id = page.chat.id;
  chatStore.set((s) => ((s.pages[id]?.ticket ?? 0) > at ? {} : { pages: { ...s.pages, [id]: { ...page, ticket: at } }, gone: without(s.gone, id) }));
}

// Resolves the page, or null when the chat could not be read, whose reason
// is kept in `gone` for the panel to say.
export async function loadPage(id) {
  const at = (ticket += 1);
  const gen = chatStore.generation();
  try {
    const page = await getChatPage(id);
    if (gen !== chatStore.generation()) return page;
    putPage(page, at);
    chatStore.set((s) => ({ gone: without(s.gone, id) }));
    return page;
  } catch (err) {
    if (gen === chatStore.generation()) chatStore.set((s) => ({ gone: { ...s.gone, [id]: err.message } }));
    return null;
  }
}

// A failed read keeps whatever list was there: a switcher that empties
// itself says the chats are gone, which they are not.
export async function refreshList() {
  const gen = chatStore.generation();
  try {
    const views = await listChats();
    if (gen !== chatStore.generation()) return;
    chatStore.set({ list: views });
    putViews(views);
  } catch {
    if (gen === chatStore.generation()) chatStore.set((s) => ({ list: s.list ?? [] }));
  }
}

// The dot goes at once; the server's view, when it answers, agrees.
export async function markSeen(id) {
  const real = realId(id);
  chatStore.set((s) => ({ unseen: without(s.unseen, real, id) }));
  if (!real || real.includes(':')) return;
  try {
    putViews([await markChatSeen(real)]);
  } catch {
    // The dot comes back on the next read of the list, which is honest.
  }
}

// A chat deleted: nothing of it stays on screen, under either of its ids.
export function forgetChat(id) {
  const real = realId(id);
  chatStore.set((s) => ({
    pages: without(s.pages, real, id),
    alias: Object.fromEntries(Object.entries(s.alias).filter(([, to]) => to !== real)),
    list: s.list?.filter((row) => row.id !== real),
    failed: without(s.failed, real, id),
    waiting: without(s.waiting, real, id),
    unseen: without(s.unseen, real, id),
  }));
}
