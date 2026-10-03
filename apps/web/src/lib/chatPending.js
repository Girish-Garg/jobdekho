import { getChatsPending } from '../api.js';
import { ACTION_KINDS } from './chatActionKinds.js';
import { chatStore, without } from './chatStore.js';
import { loadPage, refreshList } from './chatPages.js';
import { arrived } from './chatLanding.js';

// What the server knows that this page did not see happen: a call asked
// before a reload, a follow-up the server sent itself when an answer came
// in, a failure in a chat nobody was watching. Read once a page loads and
// after every call, and asked again every two seconds while a call runs
// that this page has no stream for.
const POLL_MS = 2000;
const LETTER = /^Cover letter (\d+) of (\d+)$/;
let timer = null;
let readFor = -1;

const sayOf = (p) => p.question ?? (p.action ? ACTION_KINDS[p.action]?.label : null)
  ?? (p.kind === 'combined' && LETTER.test(p.label) ? 'Cover letter for each' : p.label);

// The same shape a call this page starts has (see chatCall.js), rebuilt
// from what the server knows: which CLI, whether it went to the web, and
// the answer as far as it had been written.
function remoteBusy(p) {
  const events = [{ event: 'start', provider: p.provider }, { event: 'progress', stage: 'send' }];
  if (p.web) events.push({ event: 'progress', stage: 'reply' }, { event: 'progress', stage: 'web' });
  if (p.stage === 'reply') events.push({ event: 'progress', stage: 'reply' });
  const letter = p.kind === 'combined' ? LETTER.exec(p.label ?? '') : null;
  return {
    chatId: p.chatId, kind: p.kind, label: p.label, title: p.title, say: sayOf(p), postingId: p.postingId, action: p.action,
    provider: p.provider, events, text: p.text ?? '', web: Boolean(p.web), startedAt: Date.parse(p.startedAt) || Date.now(),
    startedIso: p.startedAt, remote: true, letter: letter ? { index: Number(letter[1]), total: Number(letter[2]) } : null,
  };
}

// The server's failures as missed cards, each able to be asked again the
// way it was asked. One this page saw happen itself says more (how far the
// answer got, the kind of failure), so it stays.
const combinedOf = (f) => (f.kind !== 'combined' ? undefined : f.label === 'Tailor resume for all' ? 'tailor-all' : 'letters-each');
const asMissed = (failed = {}) => Object.fromEntries(Object.entries(failed).map(([id, f]) => [id, {
  question: sayOf(f), message: f.error, kind: null,
  call: { kind: f.kind, action: f.action, postingId: f.postingId, combined: combinedOf(f) },
}]));
const localOnly = (failed) => Object.fromEntries(Object.entries(failed).filter(([, missed]) => missed.local));

// An answer came in, unless the call was stopped or failed.
function answeredSince(page, iso) {
  const times = [...(page?.turns ?? []).filter((turn) => !turn.note).map((turn) => turn.createdAt),
    ...(page?.results ?? []).flatMap((record) => record.versions.map((version) => version.createdAt))];
  return times.some((at) => at && at >= iso);
}

// A call this page only watched has ended. Its answer, if any, is read from
// its chat, which also clears a failure this page wrongly guessed at (a
// stream that dropped while the server carried on).
async function ended(call) {
  if (call.postingId) chatStore.set((s) => ({ alias: { ...s.alias, [`job:${call.postingId}`]: call.chatId } }));
  const page = await loadPage(call.chatId);
  if (answeredSince(page, call.startedIso)) {
    chatStore.set((s) => ({ failed: without(s.failed, call.chatId) }));
    arrived(call.chatId, call);
  }
  refreshList();
}

export async function syncPending() {
  clearTimeout(timer);
  const gen = chatStore.generation();
  let now;
  try {
    now = await getChatsPending();
  } catch {
    if (chatStore.get().busy?.remote) timer = setTimeout(syncPending, POLL_MS);
    return;
  }
  if (gen !== chatStore.generation()) return;
  const was = chatStore.get().busy;
  const same = was && now.busy && was.chatId === now.busy.chatId && was.startedIso === now.busy.startedAt;
  chatStore.set((s) => ({
    waiting: now.waiting ?? {},
    failed: { ...asMissed(now.failed), ...localOnly(s.failed) },
    ...(s.busy?.local ? {} : { busy: now.busy ? remoteBusy(now.busy) : null }),
  }));
  if (was?.remote && !same) await ended(was);
  if (now.busy && !chatStore.get().busy?.local) timer = setTimeout(syncPending, POLL_MS);
}

// Once per page, however many times the panel opens: with the list too, so
// the top bar can say an answer is waiting before the panel is opened.
export function loadPending() {
  if (readFor === chatStore.generation()) return;
  readFor = chatStore.generation();
  syncPending();
  refreshList();
}
