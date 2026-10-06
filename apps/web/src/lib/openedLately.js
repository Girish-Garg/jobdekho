import { useSyncExternalStore } from 'react';
import { onOpenPostingChange } from './openPostingSignal.js';
import { onOpenDocumentChange } from './openDocumentSignal.js';

// The jobs opened in the pane and the documents opened on the Resume page,
// most recent first, for the chat: its dotted pills offer them in one click
// (see chatHolds.js), and "+ Add" lists the jobs first, since the job
// someone wants to compare is nearly always one they just read. Kept for
// the page's life only; a search reaches every other job.
//
//   { type: 'job', id, title, company } or { type: 'document', id, name, kind }
const MAX = 8;
let opened = [];
const listeners = new Set();

function note(type, item) {
  if (!item?.id) return;
  const entry = type === 'job'
    ? { type, id: item.id, title: item.title, company: item.company }
    : { type, id: item.id, name: item.name, kind: item.kind };
  const others = opened.filter((one) => one.type !== type || one.id !== item.id);
  const kept = [entry, ...others];
  // Each type keeps its own MAX, so a run of documents never pushes out the
  // jobs "+ Add" lists.
  const count = { job: 0, document: 0 };
  opened = kept.filter((one) => (count[one.type] += 1) <= MAX);
  listeners.forEach((listener) => listener());
}

onOpenPostingChange((posting) => note('job', posting));
onOpenDocumentChange((doc) => note('document', doc));

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const openedLately = () => opened;

export const useOpenedLately = () => useSyncExternalStore(subscribe, openedLately);

export const recentJobs = () => opened.filter((one) => one.type === 'job').map(({ id, title, company }) => ({ id, title, company }));

// Tests start each case with nothing opened.
export function resetOpenedLately() {
  opened = [];
}
