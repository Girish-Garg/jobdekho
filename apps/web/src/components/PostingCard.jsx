import { isNewToday } from '../lib/time.js';
import { levelLabel } from '../lib/taxonomy.js';
import { levelTone } from '../lib/levelColor.js';

const STATUS_WORD = { saved: 'Saved', applied: 'Applied', dismissed: 'Dismissed' };
const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';

// Onsite is also what a posting scraped before the field existed reads as, so
// it is not evidence of an office and would sit on most cards saying nothing.
const MODE_WORD = { remote: 'Remote', hybrid: 'Hybrid' };

// A card is a scan unit, so it carries only the fields you sort candidates by.
// The description lives in the overlay: on the card it turned every tile into a
// wall of grey text and killed the scan.
export default function PostingCard({ posting, onOpen }) {
  const fresh = isNewToday(posting.firstSeenAt);
  const status = STATUS_WORD[posting.status];
  const mode = MODE_WORD[posting.workMode];
  const tone = levelTone(posting.level);
  const others = (posting.groupCount || 1) - 1;
  // Only a ranked feed carries the field, and 0 is a real score, so this is a
  // presence check rather than truthiness.
  const ranked = Number.isInteger(posting.fit);
  // Only the two rungs where the ghost signals stack up. High and medium show
  // nothing: most postings are fine, and a verdict on every card is noise.
  const doubtful = posting.legitimacy === 'low' || posting.legitimacy === 'suspicious';

  return (
    <button
      type="button"
      onClick={(event) => onOpen(posting, event.currentTarget)}
      // The left edge is the level. It rides the border the card already had,
      // so the ramp costs no content pixels and reads as a column of rungs.
      className={`flex flex-col gap-2.5 rounded-lg border border-l-[3px] border-line bg-panel p-4 pl-3.5 text-left outline-none transition hover:border-ink/40 hover:shadow-sm focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink ${tone.edge} ${
        posting.status === 'dismissed' ? 'opacity-45' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        {/* The word sits in its own colour, so the edge never has to be decoded. */}
        <span className={`${LABEL} ${tone.text}`}>{levelLabel(posting.level)}</span>
        {mode && <span className={`${LABEL} text-muted`}>/ {mode}</span>}
        {/* The number the default order sorts by. It carries its unit because
            a bare integer in this row could be days, applicants or pay. Ink,
            not ember: the accent belongs to "new today" alone. */}
        {ranked && <span className={`${LABEL} tnum ml-auto shrink-0 text-ink`}>{posting.fit} fit</span>}
        {status && <span className={`${LABEL} ${ranked ? '' : 'ml-auto'} text-ink`}>{status}</span>}
        {/* Ember reads against six level hues by shape, not just colour: it is
            the only filled chip on the card, and it says what it means. */}
        {fresh && (
          <span
            aria-label="New today"
            className={`${LABEL} shrink-0 rounded-sm bg-ember px-1 py-0.5 text-paper ${status || ranked ? '' : 'ml-auto'}`}
          >
            New
          </span>
        )}
      </div>

      {/* The card is sized by its content. A fixed aspect ratio left a gap in
          the middle of every tile that read as a missing image. */}
      <div className="flex min-w-0 flex-col gap-1">
        {/* No ember on hover: the whole tile is the target now, so tinting the
            title would flash the accent all over a grid being scanned. */}
        <span className="line-clamp-2 font-display text-[15px] font-bold leading-snug tracking-tight">
          {posting.title}
        </span>
        <span className="truncate text-[13px] text-muted">{posting.company}</span>
      </div>

      {/* mt-auto only on the footer: grid rows stretch to their tallest card, so
          this keeps the rule aligned across a row instead of floating. */}
      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-2 font-mono text-[11px]">
        {/* A caution about the posting's lifecycle, so it lives with the other
            posting facts rather than in the signal row, which is full. The
            phrase describes the posting, never the employer: the evidence is
            in the overlay. Ink, not ember - a warning is not the accent. */}
        {doubtful && <span className={`${LABEL} text-ink`}>May not be a live opening</span>}
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-muted">{posting.location || 'Location not listed'}</span>
          {posting.stipend && <span className="tnum shrink-0 text-ink">{posting.stipend}</span>}
        </div>
        {others > 0 && (
          <span className="text-muted">
            +{others} other location{others === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </button>
  );
}
