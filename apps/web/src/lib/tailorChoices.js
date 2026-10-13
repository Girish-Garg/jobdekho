import { putTailorChoices } from '../api.js';
import { chatStore } from './chatStore.js';

// Saving what the person put back on a tailoring (see lib/tailorReview.js).
// One save at a time, in the order the clicks came: each sends every choice,
// so two answered out of order would leave the older set on disk.
let queue = Promise.resolve();

// The saved record replaces the one each chat on this page holds, so a card
// folded and opened again, or the same job seen from another chat, starts
// from what was chosen.
function land(record) {
  const swap = (results = []) => results.map((one) => (one.postingId === record.postingId && one.kind === record.kind ? record : one));
  chatStore.set((s) => ({
    pages: Object.fromEntries(Object.entries(s.pages).map(([id, page]) => [id, { ...page, results: swap(page.results) }])),
  }));
}

export function saveTailorChoices(postingId, choices) {
  const saved = queue.then(() => putTailorChoices(postingId, choices)).then(land);
  // A failed save is its caller's to report; the queue itself moves on.
  queue = saved.catch(() => {});
  return saved;
}

// Resolves once every save asked for so far has landed or failed: a resume
// made from the plan must be made from the choices on screen.
export const choicesSettled = () => queue;
