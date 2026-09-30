import { chatSession } from './chatSession.js';

// The one AI call the chat has in flight, whatever kind it is: a question,
// a quick action or a refine. One at a time on purpose. They all land on the
// same CLI and the same subscription, and two Claude Code processes starting
// together is exactly the sign-in refresh race that reads as 'busy' (see
// apps/server/src/ai/errors.js), so the chat waits for one answer before it
// lets the next go. A question still being answered from before a reload
// counts too (see chatLoad.js), as the server refuses a second one.
//
// `what` is { say, noun, doing, changing? }: `say` is the line the
// conversation shows for the call, the rest are the progress words. `call`
// gets the onEvent to stream into and returns the answer; runCall resolves
// with it, or with null after keeping the failure for AiError. The session
// is set synchronously, so a second click in the same frame already finds
// the first call there and is refused.

// A heartbeat every five seconds would grow the list by the minute; only
// the latest is worth keeping, since the clock counts on its own.
const withEvent = (events, event) => (event.stage === 'wait' && events.at(-1)?.stage === 'wait'
  ? [...events.slice(0, -1), event]
  : [...events, event]);

export async function runCall(what, call, providers = []) {
  if (chatSession.get().call) return null;
  const gen = chatSession.generation();
  // Writes only into the session this call began in (see chatSession.js).
  const set = (patch) => { if (chatSession.generation() === gen) chatSession.set(patch); };
  const words = { noun: what.noun, doing: what.doing };
  set({ error: null, call: { what, words, provider: null, label: '', events: [], startedAt: Date.now(), remote: false } });

  const onEvent = (event) => set((s) => {
    if (!s.call) return {};
    const started = event.event === 'start';
    // After a chat question goes to the web, the same CLI events describe a
    // search rather than a read, so the words change for the rest of the run.
    if (event.stage === 'web') Object.assign(words, { noun: 'Your question', doing: 'searching the web' });
    return {
      call: {
        ...s.call,
        words: { ...words },
        provider: started ? event.provider : s.call.provider,
        label: started ? (providers.find((p) => p.id === event.provider)?.label ?? event.provider) : s.call.label,
        events: withEvent(s.call.events, event),
      },
    };
  });

  let answer = null;
  try {
    answer = await call(onEvent);
    return answer;
  } catch (err) {
    set({ error: err });
    return null;
  } finally {
    set((s) => ({ call: null, unseen: s.unseen || (answer !== null && !chatSession.watched()) }));
  }
}

export const clearChatError = () => chatSession.set({ error: null });
