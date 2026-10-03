import { changeChatItems, clearChat, createChat, deleteChat } from '../api.js';
import { notifyError } from './toast.js';
import { onScreenId, pick } from './activeChat.js';
import { chatStore, realId, sameChat, without } from './chatStore.js';
import { forgetChat, loadPage, putViews, refreshList } from './chatPages.js';
import { newGeneralChat } from './useChatView.js';

// Changing a chat: what it holds, its messages, the chat itself. Each
// resolves the server's sentence when it refused, for the control that
// asked to say where the person is looking, or null.
async function settle(view) {
  putViews([view]);
  await loadPage(view.id);
  refreshList();
}

// Adding a job to a job's own chat starts a comparison of the two and puts
// that on screen: the job's chat stays about its job alone. Anything else
// changes the chat in place, by the rules of its kind (see the server's
// chat-items.js), a job's chat not made yet included: the view is taken in
// first, so the chat that now exists is known as the one asked about.
export async function changeItem(chatId, change) {
  try {
    const view = await changeChatItems(chatId, change);
    putViews([view]);
    if (!sameChat(view.id, chatId)) pick(view.id);
    await settle(view);
    return null;
  } catch (err) {
    return err.message;
  }
}

// "Compare jobs", from a general chat.
export async function startComparison(jobs) {
  try {
    const view = await createChat({ kind: 'compare', jobs });
    pick(view.id);
    await settle(view);
    return null;
  } catch (err) {
    return err.message;
  }
}

// The messages and the missed card go; the job's saved results and the
// documents stay where they are kept (see the server's chat-changes.js).
export async function clearThisChat(chatId) {
  try {
    const view = await clearChat(chatId);
    chatStore.set((s) => ({ failed: without(s.failed, realId(chatId, s), chatId) }));
    await settle(view);
  } catch (err) {
    notifyError(err, 'Could not clear the chat');
  }
}

// A deleted job's or document's chat leaves an empty one in its place, made
// again by its first message, since the job or the document is still
// there. Any other chat on screen gives way to a general chat.
export async function deleteThisChat(view) {
  const shown = sameChat(onScreenId(), view.id);
  try {
    await deleteChat(view.id);
  } catch (err) {
    notifyError(err, 'Could not delete the chat');
    return;
  }
  forgetChat(view.id);
  const home = { job: view.jobs?.[0] && `job:${view.jobs[0].id}`, document: view.documents?.[0] && `document:${view.documents[0].id}` }[view.kind];
  if (shown && home) {
    pick(home);
    await loadPage(home);
  } else if (shown) {
    await newGeneralChat();
  }
  refreshList();
}
