import { notify, notifyError } from './toast.js';
import { announceMemoryChanged } from './memorySignal.js';
import { onScreenId, openChat } from './activeChat.js';
import { chatStore, pageOf, realId, sameChat } from './chatStore.js';
import { loadPage, markSeen, refreshList } from './chatPages.js';
import { readyTitle } from './chatNames.js';

// Where a call's outcome goes: into the chat it was asked in, and nowhere
// else. The person is never moved to it. On screen it counts as seen;
// anywhere else it marks that chat unseen, and with the panel closed a
// notice names the chat, with a way to open it.
export function arrived(chatId, call) {
  if (chatStore.watched() && sameChat(onScreenId(), chatId)) {
    markSeen(chatId);
    return;
  }
  chatStore.set((s) => ({ unseen: { ...s.unseen, [realId(chatId, s)]: true } }));
  if (chatStore.watched()) return;
  notify({
    kind: 'done',
    title: readyTitle(pageOf(chatId)?.chat, call),
    link: { label: 'Open the chat', onClick: () => openChat(chatId) },
  });
}

// A call this page ran, answered. `body.chatId` is where the server saved
// it: a job's chat made by its first question, a job action's own chat, or
// a new general chat when the one asked in was deleted meanwhile.
export async function landAnswer(call, body) {
  if (body?.memory?.some((item) => item.status === 'saved')) announceMemoryChanged();
  const chatId = body?.chatId ?? realId(call.chatId);
  if (call.chatId !== chatId && call.chatId.includes(':')) {
    chatStore.set((s) => ({ alias: { ...s.alias, [call.chatId]: chatId } }));
  }
  await Promise.all([loadPage(chatId), call.notedIn ? loadPage(call.notedIn) : null]);
  arrived(chatId, call);
  refreshList();
}

// What a failed call leaves for its missed card: what was asked and how,
// how far it got, and the reason in the server's own words.
export function missedFrom(call, err) {
  return {
    question: call.say,
    text: call.text ?? '',
    kind: err?.kind ?? null,
    message: err?.message ?? '',
    provider: call.provider ?? '',
    elapsedMs: Date.now() - call.startedAt,
    local: true,
    call: { kind: call.kind, action: call.action, postingId: call.postingId, instruction: call.instruction, screen: call.screen, combined: call.combined },
  };
}

// A failure stays in the chat it was asked in. A job's chat asked in by its
// placeholder exists by now, so it is read to learn its id. With no panel to
// show it, a question's failure is said in a notice too; an action's
// already is (see aiCall.js), and a stop is the person's own doing.
export async function landFailure(call, err) {
  chatStore.set((s) => ({ failed: { ...s.failed, [realId(call.chatId, s)]: missedFrom(call, err) } }));
  if (!chatStore.watched() && err?.kind !== 'stopped' && call.kind !== 'action') notifyError(err, 'The assistant could not answer');
  if (!call.chatId.includes(':')) return refreshList();
  await loadPage(call.chatId);
  chatStore.set((s) => {
    const real = realId(call.chatId, s);
    if (real === call.chatId || !s.failed[call.chatId]) return {};
    const { [call.chatId]: missed, ...rest } = s.failed;
    return { failed: { ...rest, [real]: missed } };
  });
  refreshList();
}
