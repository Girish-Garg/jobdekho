import { useRef, useState } from 'react';
import { progressText } from './aiProgress.js';

// The one AI call the chat panel has in flight, whatever kind it is: a plain
// question, a quick action or a refine. One at a time on purpose. They all
// land on the same CLI and the same subscription, and two Claude Code
// processes starting together is exactly the sign-in refresh race that reads
// as 'busy' (see apps/server/src/ai/errors.js), so the panel waits for one
// answer before it lets the next question go.
//
// `what` is { say, noun, doing }: `say` is the line the conversation shows
// for the pending call, the rest is the progress line's words. `call` gets
// the onEvent to stream into and returns the answer; run() resolves with it,
// or with null after keeping the failure for AiError.
export function useAiRunner(providers) {
  const [pending, setPending] = useState(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  // Only the start event names the CLI; kept for the rest of one call.
  const label = useRef('');
  // A ref as well as state, so two clicks in the same frame cannot both pass.
  const inFlight = useRef(false);

  async function run(what, call) {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPending(what);
    setError(null);
    setProgress('Starting...');
    // After a chat question goes to the web, the same CLI events describe a
    // search rather than a read, so the words change for the rest of the run.
    const words = { ...what };
    const onEvent = (event) => {
      if (event.event === 'start') label.current = providers?.find((p) => p.id === event.provider)?.label ?? event.provider;
      if (event.stage === 'web') Object.assign(words, { noun: 'Your question', doing: 'searching the web' });
      setProgress(progressText(event, label.current, words));
    };
    try {
      return await call(onEvent);
    } catch (err) {
      setError(err);
      return null;
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  return { pending, busy: Boolean(pending), progress, error, run, clearError: () => setError(null) };
}
