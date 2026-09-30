import { notify } from './toast.js';
import { addTurn, chatSession } from './chatSession.js';

// Where an answer goes when it lands. A question belongs to the
// conversation it was asked in, and the server saves its answer there
// whatever happened meanwhile (see its api/chat.js). If the person started
// a new conversation, or continued another, while it was on its way, the
// answer is not the one on screen's to show: it is left where it was
// saved, and the person is told where to find it rather than wondering
// where it went.
export function announceFiled() {
  notify({
    kind: 'done',
    title: 'The answer went to your earlier conversation',
    detail: 'It was asked there before you switched. Open History in the chat to read it.',
  });
}

// `conversationId` on the turn is the one it was saved in; a session that
// did not know its own id yet (a first question, or one saved before
// conversations had ids) takes it from here.
export function landTurn(turn) {
  const current = chatSession.get().conversationId;
  if (turn.conversationId && current && turn.conversationId !== current) {
    announceFiled();
    return;
  }
  chatSession.set((s) => ({ conversationId: s.conversationId ?? turn.conversationId ?? null }));
  addTurn(turn);
}

// The conversation on screen replaced by another: a fresh one after "Start
// a new one", or a filed one continued from History.
export function switchConversation({ id, turns }) {
  chatSession.set({ conversationId: id ?? null, turns: turns ?? [], error: null });
}
