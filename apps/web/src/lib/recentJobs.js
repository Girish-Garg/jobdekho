import { onOpenPostingChange } from './openPostingSignal.js';

// The jobs most recently opened in the pane, newest first, for the chat's
// "+ Add": the job someone wants to compare is nearly always one they just
// read. Kept for the page's life only; a search reaches every other job.
const MAX = 8;
let recent = [];

onOpenPostingChange((posting) => {
  if (!posting?.id) return;
  const { id, title, company } = posting;
  recent = [{ id, title, company }, ...recent.filter((job) => job.id !== id)].slice(0, MAX);
});

export const recentJobs = () => recent;

// Tests start each case with none opened.
export function resetRecentJobs() {
  recent = [];
}
