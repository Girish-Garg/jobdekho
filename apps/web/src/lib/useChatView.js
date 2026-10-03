import { useEffect } from 'react';
import { createChat } from '../api.js';
import { notifyError } from './toast.js';
import { onScreenId, pick } from './activeChat.js';
import { entryFor, pageOf, realId, useChatStore } from './chatStore.js';
import { loadPage, markSeen, refreshList } from './chatPages.js';
import { onBlocked } from './blockedSignal.js';

// A fresh general chat: the empty one already made, if any, since the
// server reuses an identical empty chat rather than making a twin.
export async function newGeneralChat() {
  try {
    const chat = await createChat({ kind: 'general' });
    pick(chat.id);
    return chat;
  } catch (err) {
    notifyError(err, 'Could not start a new chat');
    return null;
  }
}

// With nothing chosen yet, or a chat that is not there any more, the panel
// opens on the newest general chat, or a new one: the conversation a person
// coming back to the chat most likely means. One chosen while a new one was
// being made (the job pane asking about its job, say) is not replaced by it.
async function settleOn(list, gone) {
  const general = list.find((view) => view.kind === 'general' && view.id !== gone);
  if (general) {
    pick(general.id);
    return;
  }
  const asked = onScreenId();
  try {
    const chat = await createChat({ kind: 'general' });
    if (onScreenId() === asked) pick(chat.id);
  } catch (err) {
    notifyError(err, 'Could not start a new chat');
  }
}

// The chat on screen as the panel draws it: read fresh every time it comes
// on screen, shown from what was already read meanwhile, and marked seen
// once it is. A company blocked meanwhile is read again too: its job's chat
// is no longer listed, and says so.
export function useChatView(id) {
  const store = useChatStore();
  const page = pageOf(id, store);
  const gone = id ? entryFor(store.gone, id, store) : null;
  const real = page && !page.chat.placeholder ? page.chat.id : null;
  const unseen = Boolean(real && (page.chat.unseen || store.unseen[real]));

  useEffect(() => {
    refreshList();
  }, []);

  useEffect(() => {
    if (!id) return undefined;
    loadPage(id);
    return onBlocked(() => {
      loadPage(id);
      refreshList();
    });
  }, [id]);

  useEffect(() => {
    if (store.list === undefined || (id && !gone)) return;
    settleOn(store.list, gone ? realId(id, store) : null);
  }, [id, gone, store.list === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (unseen) markSeen(real);
  }, [real, unseen]);

  return { page, gone, loading: Boolean(id) && !page && !gone };
}
