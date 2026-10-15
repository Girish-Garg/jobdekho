import { followUpDue, followUpText, latestLine } from './trackerStages.js';
import { shortDay } from './time.js';

// The Tracker's board (see components/TrackerBoard.jsx). Four lanes of a
// fixed height, each scrolling on its own, and Closed folded to a strip, so
// sixty applications from a mail scan sit in the same space as six. Replied,
// Assessment and Interview share "In process", where a card's flag says which.
export const LANES = [
  { key: 'applied', title: 'Applied', stages: ['applied'] },
  { key: 'emailed', title: 'Emailed', stages: ['emailed'] },
  { key: 'process', title: 'In process', stages: ['replied', 'assessment', 'interview'] },
  { key: 'offer', title: 'Offer', stages: ['offer'] },
];
export const CLOSED = { key: 'closed', title: 'Closed', stages: ['closed'] };

// The stage a card dropped on a lane takes: its own when it is already one
// of that lane's, else the lane's first.
export const droppedStage = (entry, lane) => (lane.stages.includes(entry.stage) ? entry.stage : lane.stages[0]);

const DAY_MS = 24 * 60 * 60 * 1000;
const QUIET_DAYS = 21;

// When the entry last moved, or null when nobody knows (one marked Applied
// before the Tracker kept dates).
export function lastAt(entry) {
  const dated = (entry.events ?? []).map((event) => event.at).filter(Boolean).sort();
  return dated.at(-1) ?? entry.stageAt ?? null;
}

const daysSince = (at, now) => (at ? Math.floor((now - Date.parse(at)) / DAY_MS) : null);

// The short flag on a card, one line at most: 'need' (saffron) when it waits
// on the person, 'good' for news, 'quiet' for a long silence. `action` is
// what the detail panel offers for it.
export function flagOf(entry, now = Date.now()) {
  if (followUpDue(entry, now)) return { text: 'Follow up', tone: 'need', next: 'No reply yet. A short follow-up keeps it alive.', action: 'Write a follow-up' };
  if (entry.stage === 'offer') return { text: 'Offer', tone: 'need', next: 'An offer is waiting on your answer.' };
  if (entry.stage === 'assessment') return { text: 'Test', tone: 'need', next: 'A test or assignment is waiting on you.' };
  if (entry.stage === 'interview') return { text: 'Interview', tone: 'good' };
  if (entry.stage === 'replied') return { text: 'Replied', tone: 'good' };
  const quiet = entry.stage === 'applied' ? daysSince(lastAt(entry), now) : null;
  if (quiet >= QUIET_DAYS) return { text: `${quiet}d quiet`, tone: 'quiet' };
  return null;
}

export const needsYou = (entry, now = Date.now()) => flagOf(entry, now)?.tone === 'need';

// What to start in the chat for the panel's button.
export const requestFor = (entry) => (followUpDue(entry) ? followUpText(entry) : null);

export const cardDate = (entry) => {
  const at = lastAt(entry);
  return at ? shortDay(at) : '';
};

export const cardLine = (entry) => latestLine(entry).text;

// A lane's cards by how long ago they last moved, so a long lane reads as
// "This week, 4" rather than a wall. Undated ones go last.
const SECTIONS = [['This week', 7], ['Last two weeks', 14], ['This month', 31], ['Earlier', Infinity]];

export function sectionsOf(entries, now = Date.now()) {
  const out = SECTIONS.map(([label]) => ({ label, entries: [] }));
  for (const entry of entries) {
    const days = daysSince(lastAt(entry), now);
    const at = days == null ? SECTIONS.length - 1 : SECTIONS.findIndex(([, upto]) => days <= upto);
    out[at].entries.push(entry);
  }
  return out.filter((section) => section.entries.length);
}
