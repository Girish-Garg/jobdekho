import { useEffect } from 'react';
import { sendChatMessage, startNewConversation, stopChat } from '../api.js';
import { notifyError } from './toast.js';
import { chatSession, useChatSession } from './chatSession.js';
import { landTurn, switchConversation } from './chatLanding.js';
import { loadChat } from './chatLoad.js';

// The plain questions of the conversation: the history already on disk, and
// an ask() that sends one through the runner (see useAiRunner.js), which
// owns the wait and the failure. Both live in chatSession.js rather than in
// the panel, so an answer that lands after the panel closed is still there
// when it opens, and the history is read once per page, not per opening.
//
// "Start a new one" files the conversation away on the server rather than
// deleting it (see its chat-conversations.js); History is where it goes.
// `switchTo` puts a conversation continued from there on screen.
//
// A question that gets no answer stays in the conversation (`missed`, see
// ChatMissed.jsx) with what it was asked from, so Ask again asks it the same
// way. `stop` ends the question being answered, on the server too.
export function useChat(runner) {
  const { turns, missed } = useChatSession();

  useEffect(() => { loadChat(); }, []);

  // The failure shows in the conversation; the notice is for when no panel
  // is open to show it there. A stop is the person's own doing.
  async function ask(message, screen) {
    const what = { say: message, noun: 'Question', doing: 'thinking', ask: true, screen };
    const turn = await runner.run(what, (onEvent) =>
      sendChatMessage({ message, ...screen }, { onEvent }).catch((err) => {
        if (!chatSession.watched() && err.kind !== 'stopped') notifyError(err, 'The assistant could not answer');
        throw err;
      }));
    if (turn) landTurn(turn);
  }

  async function stop() {
    try {
      await stopChat();
    } catch (err) {
      notifyError(err, 'Could not stop the answer');
    }
  }

  // A conversation that could not be filed stays on screen, whole, rather
  // than vanishing from view while the server still holds it as current.
  async function startNew() {
    let fresh;
    try {
      fresh = await startNewConversation();
    } catch (err) {
      notifyError(err, 'Could not start a new conversation');
      return;
    }
    chatSession.set({ missed: null });
    switchConversation(fresh);
  }

  return {
    turns,
    missed,
    ask,
    stop,
    forget: () => chatSession.set({ missed: null }),
    startNew,
    switchTo: switchConversation,
  };
}
