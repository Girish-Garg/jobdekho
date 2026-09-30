import { levelLabel } from '../lib/taxonomy.js';

const CHIP = 'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium';

// Onsite is also what a posting scraped before the field existed reads as, so
// it is not evidence of an office and would sit on most rows saying nothing.
const MODE_WORD = { remote: 'Remote', hybrid: 'Hybrid' };

// A config entry for a Y Combinator company tags its postings "YC W21" (see
// config/companies.json); the chip says YC and the batch is on hover.
const YC_TAG = /^YC [A-Z]\d{2}$/;

// What the person already did, in the colours the pane uses for the same.
const STATUS = {
  saved: ['Saved', 'border-primary/40 bg-primary/10 text-primary'],
  applied: ['Applied', 'border-applied/40 bg-applied/10 text-applied'],
  dismissed: ['Dismissed', 'border-line bg-select text-muted'],
};

// The small facts a row and a card are scanned by: the level, a work mode
// worth mentioning, a YC company, a caution when the posting's ghost signals
// stack up, the person's status, and whether the job has closed (a closed
// posting is only still shown in the person's own lists). `dominantWorkMode`
// is the mode most of the page shares, which says nothing about any one row,
// so a list passes it to leave it out; a card, read on its own, does not.
export default function PostingTags({ posting, dominantWorkMode = null, align = 'end' }) {
  const mode = posting.workMode !== dominantWorkMode ? MODE_WORD[posting.workMode] : null;
  const doubtful = posting.legitimacy === 'low' || posting.legitimacy === 'suspicious';
  const status = STATUS[posting.status];
  const yc = (posting.tags ?? []).find((tag) => YC_TAG.test(tag));

  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${align === 'start' ? 'justify-start' : 'justify-end'}`}>
      {/* A missing level reads as Mid, the same fallback levelLabel uses. */}
      <span className={`${CHIP} border-line text-ink/80`}>{levelLabel(posting.level)}</span>
      {mode && <span className={`${CHIP} border-line text-ink`}>{mode}</span>}
      {yc && <span className={`${CHIP} border-line text-muted`} title={`Y Combinator, batch ${yc.slice(3)}`}>YC</span>}
      {doubtful && <span className={`${CHIP} border-ember/40 bg-ember/10 text-ember`}>Caution</span>}
      {status && <span className={`${CHIP} ${status[1]}`}>{status[0]}</span>}
      {posting.closedAt && <span className={`${CHIP} border-line bg-select text-muted`} title="The board no longer lists this job">Closed</span>}
    </span>
  );
}
