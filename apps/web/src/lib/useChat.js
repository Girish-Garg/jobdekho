import { useEffect } from 'react';
import { sendChatMessage, clearChatHistory } from '../api.js';
import { notifyError } from './toast.js';
import { addTurn, chatSession, useChatSession } from './chatSession.js';
import { loadChat } from './chatLoad.js';

// The plain questions of the conversation: the history already on disk, and
// an ask() that sends one through the runner (see useAiRunner.js), which
// owns the wait and the failure. Both live in chatSession.js rather than in
// the panel, so an answer that lands after the panel closed is still there
// when it opens, and the history is read once per page, not per opening.
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
    if (turn) addTurn(turn);
  }

  async function startNew() {
    await clearChatHistory().catch(() => {});
    chatSession.set({ turns: [] });
    runner.clearError();
  }

  return { turns, ask, startNew };
}
