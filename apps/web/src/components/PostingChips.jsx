import { levelLabel, workModeLabel } from '../lib/taxonomy.js';
import { isNewToday } from '../lib/time.js';
import Chip from './ui/Chip.jsx';

// What the person already did with this job, in the same colours the footer
// buttons take when pressed, so the header and the controls agree.
const STATUS = {
  saved: ['Saved', 'primary', 'border-primary/40'],
  applied: ['Applied', 'applied', 'border-applied/40 bg-applied/10'],
  dismissed: ['Dismissed', 'quiet', 'border-line'],
};

// The level and the work mode are what a person filters by, so they sit in
// the header as chips rather than among the facts: seen first, in the same
// neutral chip the feed uses for the same job.
export default function PostingChips({ posting }) {
  const level = posting.level ? levelLabel(posting.level) : '';
  const mode = workModeLabel(posting.workMode);
  const fresh = isNewToday(posting.firstSeenAt);
  const status = STATUS[posting.status];
  if (!level && !mode && !fresh && !status) return null;

  return (
    <ul aria-label="About this job" className="mt-2.5 flex flex-wrap gap-1.5">
      {level && <Chip as="li" tone="line" className="bg-transparent font-medium text-ink/80">{level}</Chip>}
      {mode && <Chip as="li" tone="line" className="bg-transparent font-medium">{mode}</Chip>}
      {fresh && <Chip as="li" tone="primary" className="border border-primary/40 font-medium">New today</Chip>}
      {status && <Chip as="li" tone={status[1]} className={`border font-medium ${status[2]}`}>{status[0]}</Chip>}
    </ul>
  );
}
