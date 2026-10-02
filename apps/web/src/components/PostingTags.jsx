import { levelLabel } from '../lib/taxonomy.js';
import Chip from './ui/Chip.jsx';

// Every tag keeps its size when a row squeezes, and the neutral ones stay
// see-through so a hovered or selected row shows through them.
const CHIP = 'shrink-0 font-medium';
const HAIRLINE = `${CHIP} bg-transparent`;

// Onsite is also what a posting scraped before the field existed reads as, so
// it is not evidence of an office and would sit on most rows saying nothing.
const MODE_WORD = { remote: 'Remote', hybrid: 'Hybrid' };

// A config entry for a Y Combinator company tags its postings "YC W21" (see
// config/companies.json); the chip says YC and the batch is on hover.
const YC_TAG = /^YC [A-Z]\d{2}$/;

// What the person already did, in the tones the pane uses for the same, each
// on the hairline every tag in the feed carries.
const STATUS = {
  saved: ['Saved', 'primary', 'border-primary/40'],
  applied: ['Applied', 'applied', 'border-applied/40 bg-applied/10'],
  dismissed: ['Dismissed', 'quiet', 'border-line'],
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
      <Chip tone="line" className={`${HAIRLINE} text-ink/80`}>{levelLabel(posting.level)}</Chip>
      {mode && <Chip tone="line" className={HAIRLINE}>{mode}</Chip>}
      {yc && <Chip tone="line" className={`${HAIRLINE} text-muted`} title={`Y Combinator, batch ${yc.slice(3)}`}>YC</Chip>}
      {doubtful && <Chip tone="line" className={`${CHIP} border-ember/40 bg-ember/10 text-ember`}>Caution</Chip>}
      {status && <Chip tone={status[1]} className={`${CHIP} border ${status[2]}`}>{status[0]}</Chip>}
      {posting.closedAt && <Chip className={`${CHIP} border border-line`} title="The board no longer lists this job">Closed</Chip>}
    </span>
  );
}
