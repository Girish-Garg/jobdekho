import { shortStamp } from './time.js';

// The mail scan's status in words, for the Tracker's line and Settings'
// Gmail card (see useMailScan.js).
const MINUTE = 60 * 1000;

export function ago(at, now = Date.now()) {
  const gone = now - Date.parse(at);
  if (!(gone >= 0)) return shortStamp(at);
  if (gone < MINUTE) return 'just now';
  if (gone < 60 * MINUTE) return `${Math.floor(gone / MINUTE)} ${gone < 2 * MINUTE ? 'minute' : 'minutes'} ago`;
  if (gone < 24 * 60 * MINUTE) return `${Math.floor(gone / (60 * MINUTE))} ${gone < 120 * MINUTE ? 'hour' : 'hours'} ago`;
  return shortStamp(at);
}

const STEPS = {
  starting: () => 'Starting the scan...',
  searching: () => 'Searching your Gmail for job mail...',
  reading: (p) => (p.total ? `Reading ${p.read ?? 0} of ${p.total} mails...` : 'Reading the mails it found...'),
  filing: () => 'Filing them in your Tracker...',
};

// One line: what it is doing now, what went wrong, or when it last looked.
export function scanLine(status, now = Date.now()) {
  if (!status) return '';
  if (status.running) return (STEPS[status.progress?.step] ?? STEPS.starting)(status.progress ?? {});
  if (status.last && !status.last.ok) return status.last.error;
  return status.lastAt ? `Gmail checked ${ago(status.lastAt, now)}` : '';
}

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// What the last scan did, said once it is over.
export function resultLine(last) {
  if (!last?.ok) return '';
  const done = last.added || last.updated
    ? `Added ${count(last.added, 'application', 'applications')} and updated ${last.updated}.`
    : 'Nothing new in your mail.';
  return last.unsure ? `${done} ${count(last.unsure, 'mail it was not sure of was', 'mails it was not sure of were')} left out.` : done;
}
