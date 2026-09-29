import { isNewToday, relativeDay } from '../lib/time.js';
import { compactPay } from '../lib/compactPay.js';
import CompanyMark from './CompanyMark.jsx';
import PostingTags from './PostingTags.jsx';
import FitMeter from './FitMeter.jsx';

// A card is a scan unit, so it carries only the fields candidates are sorted
// by: who (monogram, company, place), what (the title), the tags, and at the
// foot the score and the pay. The description lives in the pane: on the card
// it turned every tile into a wall of grey text and killed the scan.
export default function PostingCard({ posting, selected = false, onOpen }) {
  const fresh = isNewToday(posting.firstSeenAt);
  const others = (posting.groupCount || 1) - 1;
  const pay = compactPay(posting.stipend);
  const age = relativeDay(posting.postedAt || posting.firstSeenAt);

  return (
    <button
      type="button"
      data-row-id={posting.id}
      onClick={(event) => onOpen(posting, event.currentTarget)}
      // Selection borrows the token the row uses, so j/k reads the same way in
      // either view; the lift on hover says the whole tile is the target.
      className={`group flex flex-col gap-3 rounded-xl border p-4 text-left outline-none transition duration-fast ease hover:-translate-y-0.5 hover:border-edge hover:shadow-pop focus-visible:ring-2 focus-visible:ring-primary/50 ${
        selected ? 'border-primary/50 bg-select' : 'border-line bg-panel'
      } ${posting.status === 'dismissed' ? 'opacity-50' : ''}`}
    >
      <span className="flex items-center gap-3">
        <CompanyMark company={posting.company} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{posting.company}</span>
          <span className="block truncate text-xs text-muted">
            {posting.location || 'Location not listed'}{others > 0 ? ` +${others}` : ''}
          </span>
        </span>
        {fresh && <span aria-label="New today" className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">New</span>}
      </span>

      <span className="line-clamp-2 font-display text-base font-bold leading-snug tracking-tight text-ink">{posting.title}</span>

      <PostingTags posting={posting} align="start" />

      {/* mt-auto only on the foot: grid rows stretch to their tallest card, so
          this keeps the rule aligned across a row instead of floating. */}
      <span className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        {Number.isInteger(posting.fit)
          ? <FitMeter fit={posting.fit} grade={posting.grade} breakdown={posting.breakdown} />
          : <span className="text-xs text-muted">{age}</span>}
        {pay ? <span className="tnum truncate text-sm font-semibold text-ink">{pay}</span> : <span className="text-xs text-muted">{Number.isInteger(posting.fit) ? age : ''}</span>}
      </span>
    </button>
  );
}
