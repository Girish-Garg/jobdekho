import { shortDay } from './time.js';

// How the Tracker page groups and words what the server keeps (see its
// store's tracker-entry.js). "Waiting" is applied or emailed with no word
// back yet, the tab a person opens to see who to chase.
export const STAGES = ['applied', 'emailed', 'replied', 'assessment', 'interview', 'offer', 'closed'];

export const STAGE_WORD = {
  applied: 'Applied', emailed: 'Emailed', replied: 'Replied', assessment: 'Assessment', interview: 'Interview', offer: 'Offer', closed: 'Closed',
};

const WAITING = new Set(['applied', 'emailed']);
const one = (stage) => ({ key: stage, label: STAGE_WORD[stage], has: (entry) => entry.stage === stage });

export const TABS = [
  { key: 'all', label: 'All', has: () => true },
  { key: 'waiting', label: 'Waiting', has: (entry) => WAITING.has(entry.stage) },
  ...['replied', 'assessment', 'interview', 'offer', 'closed'].map(one),
];

export const tabCount = (entries, key) => entries.filter(TABS.find((tab) => tab.key === key).has).length;

// The newest line of an entry's history that says something, else its stage.
export function latestLine(entry) {
  const said = [...(entry.events ?? [])].reverse().find((event) => event.text);
  if (said) return { text: said.text, at: said.at };
  return { text: STAGE_WORD[entry.stage] ?? entry.stage, at: entry.stageAt };
}

export const when = (at) => (at ? shortDay(at) : 'date not known');

// A mail with no answer after this many days gets a follow-up offered.
export const FOLLOW_UP_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export function followUpDue(entry, now = Date.now()) {
  if (entry.stage !== 'emailed' || !entry.contact?.email || !entry.stageAt) return false;
  return now - Date.parse(entry.stageAt) >= FOLLOW_UP_DAYS * DAY_MS;
}

// The request a follow-up starts the chat with, for the person to send or
// change: who, about what, and when they last mailed.
export function followUpText(entry) {
  const about = [entry.role, entry.company].filter(Boolean).join(' at ');
  return `Write a follow-up mail to ${entry.contact.email}${about ? ` about ${about}` : ''}. I mailed them on ${shortDay(entry.stageAt)} and have not heard back.`;
}
