import { chatSession } from './chatSession.js';

// The one AI call the chat has in flight, whatever kind it is: a question,
// a quick action or a refine. One at a time on purpose. They all land on the
// same CLI and the same subscription, and two Claude Code processes starting
// together is exactly the sign-in refresh race that reads as 'busy' (see
// apps/server/src/ai/errors.js), so the chat waits for one answer before it
// lets the next go. A question still being answered from before a reload
// counts too (see chatLoad.js), as the server refuses a second one.
//
// `what` is { say, noun, doing, changing?, ask?, screen? }: `say` is the line
// the conversation shows for the call, the rest are the progress words, and
// `ask` marks a question, which is kept in the conversation when it gets no
// answer (`missed`, with the `screen` it was asked from, for Ask again)
// where a quick action's failure goes to AiError. `call` gets the onEvent to
// stream into and returns the answer; runCall resolves with it, or with
// null. The session is set synchronously, so a second click in the same
// frame already finds the first call there and is refused.

// A heartbeat every five seconds would grow the list by the minute; only
// the latest is worth keeping, since the clock counts on its own.
const withEvent = (events, event) => (event.stage === 'wait' && events.at(-1)?.stage === 'wait'
  ? [...events.slice(0, -1), event]
  : [...events, event]);

// The answer as it is written: more of it, or all of it anew when another
// CLI took over (see the server's chat/reply-stream.js). A new CLI starting
// starts it over.
function textAfter(text, event) {
  if (event.event === 'start') return '';
  if (event.event !== 'text') return text;
  return event.text ?? `${text}${event.add ?? ''}`;
}

const missedFrom = (what, call, err) => ({
  question: what.say,
  screen: what.screen ?? null,
  text: call?.text ?? '',
  kind: err?.kind ?? null,
  message: err?.message ?? '',
  provider: call?.label ?? '',
  elapsedMs: call ? Date.now() - call.startedAt : 0,
});

export async function runCall(what, call, providers = []) {
  if (chatSession.get().call) return null;
  const gen = chatSession.generation();
  // Writes only into the session this call began in (see chatSession.js).
  const set = (patch) => { if (chatSession.generation() === gen) chatSession.set(patch); };
  const words = { noun: what.noun, doing: what.doing };
  set({ error: null, missed: null, call: { what, words, provider: null, label: '', events: [], text: '', startedAt: Date.now(), remote: false } });

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
        events: event.event === 'text' ? s.call.events : withEvent(s.call.events, event),
        text: textAfter(s.call.text, event),
      },
    };
  });

  let answer = null;
  try {
    answer = await call(onEvent);
    return answer;
  } catch (err) {
    set((s) => (what.ask ? { missed: missedFrom(what, s.call, err) } : { error: err }));
    return null;
  } finally {
    set((s) => ({ call: null, unseen: s.unseen || (answer !== null && !chatSession.watched()) }));
  }
}

export const clearChatError = () => chatSession.set({ error: null });
