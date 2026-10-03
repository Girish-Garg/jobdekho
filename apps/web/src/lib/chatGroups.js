import { sameChat } from './chatStore.js';

// The switcher's groups, as picked from the rendered option A: the chat of
// the job or the document this page has open first, then every other job's
// chat, the comparisons, the documents' and the general chats, each newest
// first as the server lists them. "New general chat" ends the list (see
// ChatSwitcherMenu.jsx).
//
// `here` is the view of that first chat: a placeholder while the job or the
// document has no chat yet, which the list never holds.
const ORDER = [
  ['job', 'Other jobs', 'Jobs'],
  ['compare', 'Comparing', 'Comparing'],
  ['document', 'Other documents', 'Documents'],
  ['general', 'General', 'General'],
];

export function chatGroups(list = [], here = null, s = undefined) {
  const rest = here ? list.filter((view) => !sameChat(view.id, here.id, s)) : list;
  const groups = here ? [{ key: 'here', title: here.kind === 'document' ? 'This document' : 'This job', rows: [here] }] : [];
  for (const [kind, afterHere, alone] of ORDER) {
    const rows = rest.filter((view) => view.kind === kind);
    if (rows.length) groups.push({ key: kind, title: here?.kind === kind ? afterHere : alone, rows });
  }
  return groups;
}

// The line of a row, under its name: what it is about, then what is going
// on in it, or when it was last used.
const DOING = {
  Answering: 'answering',
  'Is it real?': 'checking if it is real',
  'Cover letter': 'writing a cover letter',
  'Tailor resume': 'tailoring your resume',
  'Tailor resume for all': 'tailoring one resume for all',
};
const doingOf = (label = '') => DOING[label] ?? (label.startsWith('Cover letter ') ? `writing letter ${label.slice(13)}` : label.toLowerCase());
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function rowLead(view) {
  if (view.kind === 'job') return view.jobs[0]?.company || 'A job';
  if (view.kind === 'compare') return plural(view.jobs.length, 'job');
  if (view.kind === 'document') return view.documents[0]?.kind === 'cover-letter' ? 'Cover letter' : 'Resume';
  return view.documents.length ? plural(view.documents.length, 'document') : 'Whole feed';
}

export function rowTitle(view) {
  if (view.kind === 'job') return view.jobs[0]?.title || view.title;
  return view.title || 'New chat';
}

// { text, mark }: mark is 'busy' for a spinner, 'unseen' for a dot, or null.
export function rowState(view, { busy, unseen, when }) {
  const lead = rowLead(view);
  if (busy) return { text: `${lead} · ${doingOf(busy.label)}...`, mark: 'busy' };
  if (unseen) return { text: `${lead} · answer ready`, mark: 'unseen' };
  if (view.waiting) return { text: `${lead} · a follow-up waits`, mark: null };
  if (view.failed) return { text: `${lead} · no answer this time`, mark: null };
  if (!view.listed) return { text: `${lead} · no longer listed`, mark: null };
  if (view.placeholder) return { text: `${lead} · no messages yet`, mark: null };
  return { text: when ? `${lead} · ${when}` : lead, mark: null };
}
