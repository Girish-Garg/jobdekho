import { sendChatMessage, queueChatMessage, stopChat, runPostingAction, tailorForAll, lettersForEach } from '../api.js';
import { notifyError } from './toast.js';
import { ACTION_KINDS } from './chatActionKinds.js';
import { chatStore, jobTitleIn, realId, sameChat, without } from './chatStore.js';
import { setDraft } from './chatDrafts.js';
import { startCall } from './chatCall.js';
import { syncPending } from './chatPending.js';

// What the chat can ask for, each one call under the one-at-a-time rule
// (see chatCall.js). `screen` is the page a question was asked from, with
// the feed's filters and sort: the server answers a general chat from what
// is on screen, and from the chat's own jobs and documents otherwise.
export const ANSWERING = 'Answering';
const ACTION_LABEL = { 'fake-check': 'Is it real?', 'cover-letter': 'Cover letter', 'resume-tailor': 'Tailor resume' };
const COMBINED = {
  'tailor-all': { label: 'Tailor resume for all', post: (...args) => tailorForAll(...args) },
  'letters-each': { label: 'Cover letter for each', post: (...args) => lettersForEach(...args) },
};

export function ask(chatId, message, screen = {}) {
  const call = { chatId, kind: 'question', label: ANSWERING, say: message, question: message, screen };
  return startCall(call, (onEvent) => sendChatMessage(chatId, { message, ...screen }, { onEvent }));
}

// A job action always runs in the job's own chat. Pressed in another chat
// that holds the job (a comparison, a document's chat), that chat keeps a
// note of where it went and stays on screen.
export function runJobAction(postingId, kind, { instruction = '', askedIn = null } = {}) {
  const meta = ACTION_KINDS[kind];
  const home = `job:${postingId}`;
  const elsewhere = askedIn && !sameChat(askedIn, home) ? askedIn : null;
  const call = {
    chatId: realId(home), kind: 'action', label: ACTION_LABEL[kind] ?? kind, say: instruction || meta.label,
    changing: instruction ? meta.name : null, postingId, action: kind, instruction, notedIn: elsewhere,
    title: jobTitleIn(chatStore.get(), postingId),
  };
  return startCall(call, (onEvent) => runPostingAction(postingId, kind, { onEvent, instruction, chatId: elsewhere ?? undefined }));
}

export function runCombined(chatId, which) {
  const { label, post } = COMBINED[which];
  return startCall({ chatId, kind: 'combined', label, say: label, combined: which }, (onEvent) => post(chatId, { onEvent }));
}

// Typed while this chat's own answer runs: held by the server, which sends
// it once the answer is in, even with the panel closed. A blank one takes
// it back. Shown at once, and put right by what the server says.
export async function queue(chatId, message, screen = {}) {
  const key = realId(chatId);
  const keep = (waiting) => chatStore.set((s) => ({ waiting: waiting ? { ...s.waiting, [key]: waiting } : without(s.waiting, key, chatId) }));
  const before = chatStore.get().waiting[key] ?? null;
  keep(message ? { message, at: new Date().toISOString() } : null);
  try {
    const answer = await queueChatMessage(chatId, { message, ...screen });
    if (answer?.started) syncPending();
    else keep(answer?.waiting ?? null);
  } catch (err) {
    keep(before);
    if (message) setDraft(key, message);
    if (err?.status === 409) syncPending();
    else notifyError(err, 'Could not keep the follow-up');
  }
}

export const unqueue = (chatId) => queue(chatId, '');

// Stop ends the running call, which is always in one known chat.
export async function stopRunning() {
  const busy = chatStore.get().busy;
  if (!busy) return;
  try {
    await stopChat(busy.chatId);
  } catch (err) {
    notifyError(err, 'Could not stop the answer');
  }
}
