import { useEffect } from 'react';
import { sendChatMessage, startNewConversation } from '../api.js';
import { notifyError } from './toast.js';
import { useChatSession } from './chatSession.js';
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
export function useChat(runner) {
  const { turns } = useChatSession();

  useEffect(() => { loadChat(); }, []);

  // A posting action's stream announces its own failure (lib/aiCall.js);
  // the chat's does not, so the notice is raised here.
  async function ask(message, screen) {
    const turn = await runner.run({ say: message, noun: 'Question', doing: 'thinking' }, (onEvent) =>
      sendChatMessage({ message, ...screen }, { onEvent }).catch((err) => {
        notifyError(err, 'The assistant could not answer');
        throw err;
      }));
    if (turn) landTurn(turn);
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
    switchConversation(fresh);
  }

  return { turns, ask, startNew, switchTo: switchConversation };
}
