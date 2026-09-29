import { levelLabel } from '../lib/taxonomy.js';
import { levelTone } from '../lib/levelColor.js';

const CHIP = 'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium';

// Onsite is also what a posting scraped before the field existed reads as, so
// it is not evidence of an office and would sit on most rows saying nothing.
const MODE_WORD = { remote: 'Remote', hybrid: 'Hybrid' };

// What the person already did, in the colours the pane uses for the same.
const STATUS = {
  saved: ['Saved', 'border-accent/40 bg-accent/10 text-accent'],
  applied: ['Applied', 'border-applied/40 bg-applied/10 text-applied'],
  dismissed: ['Dismissed', 'border-line bg-select text-muted'],
};

// The small facts a row and a card are scanned by: the level in its own
// colour, a work mode worth mentioning, a caution when the posting's ghost
// signals stack up, and the person's status. `dominantWorkMode` is the mode
// most of the page shares, which says nothing about any one row, so a list
// passes it to leave it out; a card, read on its own, does not.
export default function PostingTags({ posting, dominantWorkMode = null, align = 'end' }) {
  const mode = posting.workMode !== dominantWorkMode ? MODE_WORD[posting.workMode] : null;
  const doubtful = posting.legitimacy === 'low' || posting.legitimacy === 'suspicious';
  const status = STATUS[posting.status];

  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${align === 'start' ? 'justify-start' : 'justify-end'}`}>
      {/* A missing level reads as Mid, the same fallback the level colours use. */}
      <span className={`${CHIP} ${levelTone(posting.level).outline}`}>{levelLabel(posting.level)}</span>
      {mode && <span className={`${CHIP} border-line text-ink`}>{mode}</span>}
      {doubtful && <span className={`${CHIP} border-ember/40 bg-ember/10 text-ember`}>Caution</span>}
      {status && <span className={`${CHIP} ${status[1]}`}>{status[0]}</span>}
    </span>
  );
}
