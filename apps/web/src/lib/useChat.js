import { useEffect, useState } from 'react';
import { getChatHistory, sendChatMessage, clearChatHistory } from '../api.js';
import { notifyError } from './toast.js';

// The plain questions of the conversation: the history already on disk, and
// an ask() that sends one through the panel's runner (see useAiRunner.js),
// which owns the wait and the failure. There is no id to key this by - the
// whole conversation is the person's, not any one posting's - so history
// loads once on mount rather than per prop change.
export function useChat(runner) {
  const [turns, setTurns] = useState([]);

  useEffect(() => {
    let alive = true;
    getChatHistory().then((h) => alive && setTurns(h.turns)).catch(() => {});
    return () => { alive = false; };
  }, []);

  // A posting action's stream announces its own failure (lib/aiCall.js);
  // the chat's does not, so the notice is raised here.
  async function ask(message, screen) {
    const turn = await runner.run({ say: message, noun: 'Question', doing: 'thinking' }, (onEvent) =>
      sendChatMessage({ message, ...screen }, { onEvent }).catch((err) => {
        notifyError(err, 'The assistant could not answer');
        throw err;
      }));
    if (turn) setTurns((all) => [...all, turn]);
  }

  async function startNew() {
    await clearChatHistory().catch(() => {});
    setTurns([]);
    runner.clearError();
  }

  return { turns, ask, startNew };
}
