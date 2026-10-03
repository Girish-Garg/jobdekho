import { chatGroups } from './chatGroups.js';
import { busyIn, pageOf, sameChat } from './chatStore.js';
import { clearThisChat, deleteThisChat } from './chatChanges.js';

// The chat a job or a document open on this page would have before it has
// one: what the list would show for it, made from the job or the document.
function placeholderFor({ type, item, chatId }) {
  const job = type === 'job' ? [{ id: item.id, title: item.title ?? null, company: item.company ?? null, listed: true }] : [];
  const doc = type === 'document' ? [{ id: item.id, name: item.name ?? null, kind: item.kind ?? null, exists: true }] : [];
  return { id: chatId, kind: type, title: '', jobs: job, documents: doc, listed: true, placeholder: true, unseen: false };
}

// Everything the switcher shows: its groups (see chatGroups.js), the dot or
// ring each row gets, the one by the header's name when another chat has
// news (`signal`), and what its rows do.
export function useChatSwitcher({ store, active, view }) {
  const list = store.list ?? [];
  const lookup = (id) => list.find((row) => sameChat(row.id, id, store)) ?? pageOf(id, store)?.chat ?? null;
  const own = view && (view.kind === 'job' || view.kind === 'document') ? view : null;
  const here = active.here ? lookup(active.here.chatId) ?? placeholderFor(active.here) : own;
  const current = (id) => sameChat(id, active.id, store);
  const unseenIn = (row) => !current(row.id) && Boolean(row.unseen || store.unseen[row.id]);
  const elsewhere = store.busy && !busyIn(active.id, store);
  const news = [...list, ...(here ? [here] : [])].some(unseenIn) || Object.keys(store.unseen).some((id) => !current(id));

  return {
    signal: elsewhere ? 'busy' : news ? 'unseen' : null,
    switcher: {
      groups: chatGroups(list, here, store),
      signalOf: (row) => ({ busy: busyIn(row.id, store), unseen: unseenIn(row) }),
      onPick: active.pick,
      onClear: (chat) => clearThisChat(chat.id),
      onDelete: (chat) => deleteThisChat(chat),
    },
  };
}
