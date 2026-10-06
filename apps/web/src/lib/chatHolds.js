// What a chat reads and what it could take, from its view (see the
// server's chat/chat-view.js).

// The job a job's chat reads with every question: its own, unless the
// person left it out with the x on its chip. Left out, the chat answers as
// a general chat does, so the job's quick actions and its suggested
// questions step aside until the job is added back.
export const heldJob = (view) => (view?.kind === 'job' && !view.homeLeftOut ? view.jobs[0] ?? null : null);

// How many of each a chat of each kind may hold, as the server's
// chat-items.js says. A job offered to a job's chat starts a comparison of
// the two (see chatChanges.js), so a job's chat always has room for one.
export const ROOM = {
  job: { job: Infinity, document: 3 },
  document: { job: 5, document: 3 },
  compare: { job: 5, document: 3 },
  general: { job: 0, document: 3 },
};
const OFFERED = 3;

// The dotted pills under the header: the jobs and documents opened lately
// (see openedLately.js) that the chat does not hold and has room for,
// newest first, at most three; "+ Add" reaches the rest. The chat's own
// job or document is never among them: left out, it has a pill of its own.
export function chatOffers(view, opened) {
  if (!view) return [];
  const room = ROOM[view.kind] ?? ROOM.general;
  const held = { job: view.jobs, document: view.documents };
  const takes = (one) => held[one.type].length < room[one.type] && !held[one.type].some((item) => item.id === one.id);
  return opened.filter(takes).slice(0, OFFERED);
}
