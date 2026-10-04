import { levelChip, modeChip } from '../lib/tagEvidence.js';
import TagChip from './TagChip.jsx';
import CautionChip from './CautionChip.jsx';
import Chip from './ui/Chip.jsx';

// Every tag keeps its size when a row squeezes, and the neutral ones stay
// see-through so a hovered or selected row shows through them.
const CHIP = 'shrink-0 font-medium';
const HAIRLINE = `${CHIP} bg-transparent`;

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
// worth mentioning, a YC company, Caution on a posting that states a red
// flag, the person's status, and whether the job has closed (a closed
// posting is only still shown in the person's own lists). The level and
// the mode say on hover and focus what they were read from (TagChip.jsx).
// `dominantWorkMode` is the mode most of the page shares, which says
// nothing about any one row, so a list passes it to leave it out; a card,
// read on its own, does not. `align` is the side the tags and their tips
// line up with.
export default function PostingTags({ posting, dominantWorkMode = null, align = 'end' }) {
  // No level chip when the posting does not say its level: a guessed "Mid"
  // read as a fact, and the owner chose no tag over a wrong one.
  const level = levelChip(posting);
  const mode = modeChip(posting, dominantWorkMode);
  const status = STATUS[posting.status];
  const yc = (posting.tags ?? []).find((tag) => YC_TAG.test(tag));

  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${align === 'start' ? 'justify-start' : 'justify-end'}`}>
      {level && <TagChip tone="line" align={align} evidence={level.evidence} className={`${HAIRLINE} text-ink/80`}>{level.label}</TagChip>}
      {mode && <TagChip tone="line" align={align} evidence={mode.evidence} className={HAIRLINE}>{mode.label}</TagChip>}
      {yc && <Chip tone="line" className={`${HAIRLINE} text-muted`} title={`Y Combinator, batch ${yc.slice(3)}`}>YC</Chip>}
      {posting.caution?.length > 0 && <CautionChip caution={posting.caution} align={align} />}
      {status && <Chip tone={status[1]} className={`${CHIP} border ${status[2]}`}>{status[0]}</Chip>}
      {posting.closedAt && <Chip className={`${CHIP} border border-line`} title="The board no longer lists this job">Closed</Chip>}
    </span>
  );
}
