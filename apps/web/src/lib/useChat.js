import { useEffect, useRef, useState } from 'react';
import { getChatHistory, sendChatMessage, clearChatHistory } from '../api.js';
import { progressText } from './aiProgress.js';
import { notifyError } from './toast.js';

// One conversation, held the way usePostingAction.js holds one AI action: the
// history already on disk, a send() that narrates the wait, and the error a
// failed call leaves behind for AiError to show. There is no id to key this
// by - the whole conversation is the person's, not any one posting's - so
// history loads once on mount rather than per prop change.
export function useChat(providers) {
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  // Only the start event names the CLI; kept for the rest of one turn's progress line.
  const label = useRef('');

  useEffect(() => {
    let alive = true;
    getChatHistory().then((h) => alive && setTurns(h.turns)).catch(() => {});
    return () => { alive = false; };
  }, []);

  function onEvent(event) {
    if (event.event === 'start') {
      label.current = providers?.find((p) => p.id === event.provider)?.label ?? event.provider;
    }
    setProgress(progressText(event, label.current, { noun: 'Question', doing: 'thinking' }));
  }

  async function send(message, screen) {
    setBusy(true);
    setError(null);
    setProgress('Starting...');
    try {
      const turn = await sendChatMessage({ message, ...screen }, { onEvent });
      setTurns((all) => [...all, turn]);
    } catch (err) {
      setError(err);
      notifyError(err, 'The assistant could not answer');
    }
    setBusy(false);
  }

  async function startNew() {
    await clearChatHistory().catch(() => {});
    setTurns([]);
    setError(null);
  }

  return { turns, busy, progress, error, send, startNew, clearError: () => setError(null) };
}
