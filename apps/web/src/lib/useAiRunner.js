import { progressText } from './aiProgress.js';
import { useChatSession } from './chatSession.js';
import { runCall, clearChatError } from './chatCall.js';

// The panel's view of the one AI call in flight (see chatCall.js, which
// holds it for the life of the page rather than of the panel). `call` is the
// whole record the waiting card is drawn from; `pending` and `progress` are
// the older, flatter reading of it that the rest of the panel still uses.
export function useAiRunner(providers) {
  const { call, error } = useChatSession();
  const last = call?.events.at(-1);
  const progress = !call ? '' : last ? progressText(last, call.label, call.words) : 'Starting...';
  return {
    pending: call?.what ?? null,
    busy: Boolean(call),
    call,
    progress,
    error,
    run: (what, fn) => runCall(what, fn, providers ?? []),
    clearError: clearChatError,
  };
}
