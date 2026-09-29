import { levelLabel, workModeLabel } from '../lib/taxonomy.js';
import { levelTone } from '../lib/levelColor.js';
import { isNewToday } from '../lib/time.js';

const CHIP = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium';

// What the person already did with this job, in the same colours the footer
// buttons take when pressed, so the header and the controls agree.
const STATUS = {
  saved: ['Saved', 'border-accent/40 bg-accent/10 text-accent'],
  applied: ['Applied', 'border-applied/40 bg-applied/10 text-applied'],
  dismissed: ['Dismissed', 'border-line bg-select text-muted'],
};

// The level and the work mode are what a person filters by, so they sit in
// the header as chips rather than among the facts: seen first, in the level
// colour the feed already uses for the same job.
export default function PostingChips({ posting }) {
  const level = posting.level ? levelLabel(posting.level) : '';
  const mode = workModeLabel(posting.workMode);
  const fresh = isNewToday(posting.firstSeenAt);
  const status = STATUS[posting.status];
  if (!level && !mode && !fresh && !status) return null;

  return (
    <ul aria-label="About this job" className="mt-2.5 flex flex-wrap gap-1.5">
      {level && <li className={`${CHIP} ${levelTone(posting.level).outline}`}>{level}</li>}
      {mode && <li className={`${CHIP} border-line text-ink`}>{mode}</li>}
      {fresh && <li className={`${CHIP} border-primary/40 bg-primary/10 text-primary`}>New today</li>}
      {status && <li className={`${CHIP} ${status[1]}`}>{status[0]}</li>}
    </ul>
  );
}
