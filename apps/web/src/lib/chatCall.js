import { chatStore, entryFor, realId, without } from './chatStore.js';
import { draftOf, setDraft } from './chatDrafts.js';
import { loadPage, refreshList } from './chatPages.js';
import { landAnswer, landFailure } from './chatLanding.js';
import { syncPending } from './chatPending.js';

// The one AI call this page runs at a time, in the chat it was asked in. One
// at a time on purpose: concurrent CLI runs fight over one sign-in, and the
// server refuses a second call (409) anyway. The call's chat is part of it
// from the start, so its thinking card, its answer and its failure show in
// that chat and nowhere else.
//
// `call` is { chatId, kind, label, say, question?, changing?, postingId?,
// action?, instruction?, screen?, combined?, notedIn? }; `run(onEvent)`
// streams it and resolves the body.

// A heartbeat every five seconds would grow the list by the minute; only
// the latest is worth keeping, since the clock counts on its own.
const withEvent = (events, event) => (event.stage === 'wait' && events.at(-1)?.stage === 'wait'
  ? [...events.slice(0, -1), event]
  : [...events, event]);

// The answer as it is written: more of it, or all of it anew when another
// CLI took over. A new CLI starting starts it over.
function textAfter(text, event) {
  if (event.event === 'start') return '';
  if (event.event !== 'text') return text;
  return event.text ?? `${text}${event.add ?? ''}`;
}

// One letter of "Cover letter for each" starts like a call of its own.
export function foldEvent(busy, event) {
  if (event.stage === 'letter') return { ...busy, label: event.label, letter: { index: event.index, total: event.total }, events: [], text: '' };
  return {
    ...busy,
    provider: event.event === 'start' ? event.provider : busy.provider,
    web: busy.web || event.stage === 'web',
    events: event.event === 'text' ? busy.events : withEvent(busy.events, event),
    text: textAfter(busy.text, event),
  };
}

// Refused because another chat's call runs: the question goes back into its
// draft, unless something new was typed there meanwhile, and the busy note
// takes over from what the server says is running.
function refused(call) {
  const key = realId(call.chatId);
  if (call.question && !draftOf(key)) setDraft(key, call.question);
  syncPending();
}

export async function startCall(call, run) {
  if (chatStore.get().busy) return null;
  const gen = chatStore.generation();
  const mine = () => gen === chatStore.generation();
  const asked = call.chatId;
  chatStore.set((s) => ({
    busy: { ...call, local: true, startedAt: Date.now(), provider: null, events: [], text: '', web: false, letter: null },
    failed: without(s.failed, asked, realId(asked, s)),
  }));
  // The note a job action leaves in the chat it was pressed in is saved
  // before the action starts, so it is read as soon as the action is under
  // way: the view does not move, and the note says where it went. The list
  // is read again then too: the server has made the call's chat by then and
  // lists it while it runs, where a new chat used to reach the switcher only
  // once its first answer was in.
  let started = false;
  const onEvent = (event) => {
    if (!mine()) return;
    chatStore.set((s) => (s.busy?.local ? { busy: foldEvent(s.busy, event) } : {}));
    if (started) return;
    started = true;
    refreshList();
    if (call.notedIn) loadPage(call.notedIn);
  };
  const ending = () => {
    const ran = chatStore.get().busy;
    const followUp = Boolean(entryFor(chatStore.get().waiting, asked));
    chatStore.set({ busy: null });
    // The server sends the chat's waiting follow-up itself as the call
    // ends, with no stream for this page to watch: it is read from there.
    if (followUp) syncPending();
    return ran ?? call;
  };
  try {
    const body = await run(onEvent);
    if (mine()) await landAnswer(ending(), body);
    return body;
  } catch (err) {
    if (!mine()) return null;
    const ran = ending();
    if (err?.status === 409) refused(ran);
    else await landFailure(ran, err);
    return null;
  }
}
