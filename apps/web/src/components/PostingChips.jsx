import { levelChip, modeChip } from '../lib/tagEvidence.js';
import { isNew, foundToday } from '../lib/postingNotes.js';
import TagChip from './TagChip.jsx';
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
// neutral chip the feed uses for the same job, and saying on hover and focus
// what they were read from. New is the board's own date within a day; a job
// first found today but posted earlier says so instead, quietly.
export default function PostingChips({ posting }) {
  const level = levelChip(posting);
  const mode = modeChip(posting);
  const fresh = isNew(posting);
  const found = foundToday(posting);
  const status = STATUS[posting.status];
  if (!level && !mode && !fresh && !found && !status) return null;

  return (
    <ul aria-label="About this job" className="mt-2.5 flex flex-wrap gap-1.5">
      {level && (
        <li className="flex">
          <TagChip tone="line" evidence={level.evidence} className="bg-transparent font-medium text-ink/80">{level.label}</TagChip>
        </li>
      )}
      {mode && (
        <li className="flex">
          <TagChip tone="line" evidence={mode.evidence} className="bg-transparent font-medium">{mode.label}</TagChip>
        </li>
      )}
      {fresh && <Chip as="li" tone="primary" className="border border-primary/40 font-medium">New today</Chip>}
      {found && <Chip as="li" tone="line" className="bg-transparent font-medium text-muted">Found today</Chip>}
      {status && <Chip as="li" tone={status[1]} className={`border font-medium ${status[2]}`}>{status[0]}</Chip>}
    </ul>
  );
}
