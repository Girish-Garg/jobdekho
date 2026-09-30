import { getChatHistory, getChatPending } from '../api.js';
import { chatSession } from './chatSession.js';
import { announceFiled } from './chatLanding.js';

const POLL_MS = 2000;

let loading = null;
let loadingFor = -1;

// Writes only into the session it was started for.
const setFor = (gen, patch) => { if (chatSession.generation() === gen) chatSession.set(patch); };

// The conversation, once per page. The question in flight is read before
// the history, never after: the server saves an answer before it stops
// calling the question pending, so a question that is no longer pending is
// always already in the history read next.
export function loadChat({ pollMs = POLL_MS } = {}) {
  const gen = chatSession.generation();
  if (chatSession.get().loaded) return Promise.resolve();
  if (loading && loadingFor === gen) return loading;
  loadingFor = gen;
  loading = (async () => {
    const now = await getChatPending().catch(() => null);
    const history = await getChatHistory().catch(() => ({ turns: [] }));
    setFor(gen, (s) => ({
      turns: merged(history?.turns ?? [], s.turns), conversationId: history?.id ?? s.conversationId, loaded: true,
    }));
    if (chatSession.generation() === gen) settle(now, pollMs, gen);
  })().catch(() => setFor(gen, { loaded: true })).finally(() => { if (loadingFor === gen) loading = null; });
  return loading;
}

// A page reloaded mid-answer has no stream to watch, so it shows the
// question as pending and asks the server how it is going until it is not.
function settle(now, pollMs, gen) {
  if (now?.failed) chatSession.set({ error: failure(now.failed) });
  if (!now?.pending || chatSession.get().call) return;
  chatSession.set({ call: remoteCall(now.pending) });
  follow(pollMs, gen, now.pending.conversationId ?? null);
}

// A server briefly out of reach is asked again rather than taken as done.
// `askedIn` is the conversation the question was asked in: if the person
// filed that one away meanwhile, its answer is not in the history read at
// the end, and they are told where it went (see chatLanding.js).
function follow(pollMs, gen, askedIn) {
  setTimeout(async () => {
    if (chatSession.generation() !== gen) return;
    let now;
    try {
      now = await getChatPending();
    } catch {
      follow(pollMs, gen, askedIn);
      return;
    }
    if (now?.pending) {
      setFor(gen, (s) => (s.call?.remote ? { call: remoteCall(now.pending) } : {}));
      follow(pollMs, gen, askedIn);
      return;
    }
    const history = await getChatHistory().catch(() => null);
    const filed = Boolean(askedIn && history?.id && history.id !== askedIn && !now?.failed);
    setFor(gen, (s) => ({
      call: s.call?.remote ? null : s.call,
      turns: history?.turns ?? s.turns,
      conversationId: history?.id ?? s.conversationId,
      unseen: s.unseen || (!filed && !chatSession.watched()),
      error: now?.failed ? failure(now.failed) : s.error,
    }));
    if (filed && chatSession.generation() === gen) announceFiled();
  }, pollMs);
}

// The same shape chatCall.js keeps for a call this page started, rebuilt
// from what the server knows: which CLI, and whether it went to the web.
function remoteCall(pending) {
  const events = [{ event: 'start', provider: pending.provider }, { event: 'progress', stage: 'send' }];
  if (pending.web) events.push({ event: 'progress', stage: 'reply' }, { event: 'progress', stage: 'web' });
  if (pending.stage === 'reply') events.push({ event: 'progress', stage: 'reply' });
  return {
    what: { say: pending.question, noun: 'Question', doing: 'thinking' },
    words: { noun: 'Question', doing: pending.web ? 'searching the web' : 'thinking' },
    provider: pending.provider,
    label: '',
    events,
    // The answer as far as it had been written when the page asked.
    text: pending.text ?? '',
    startedAt: Date.parse(pending.startedAt) || Date.now(),
    remote: true,
  };
}

// A question asked before the history arrived is already in the session,
// and the history read may or may not hold it yet: kept once either way.
function merged(saved, local) {
  const ids = new Set(saved.map((turn) => turn.id).filter(Boolean));
  return [...saved, ...local.filter((turn) => !turn.id || !ids.has(turn.id))];
}

const failure = ({ question, error }) => Object.assign(new Error(error), { question });
