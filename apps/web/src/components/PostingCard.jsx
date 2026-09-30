import { isNewToday, relativeDay } from '../lib/time.js';
import { compactPay } from '../lib/compactPay.js';
import CompanyMark from './CompanyMark.jsx';
import PostingTags from './PostingTags.jsx';
import FitMeter from './FitMeter.jsx';
import RowActions from './RowActions.jsx';

// A card is a scan unit, so it carries only the fields candidates are sorted
// by: who (monogram, company, place), what (the title), the tags, and at the
// foot the score and the pay. The description lives in the pane: on the card
// it turned every tile into a wall of grey text and killed the scan.
//
// The whole card opens the job through one button stretched over it, and the
// quick actions sit above that button as buttons of their own: a button
// cannot hold buttons, and a card with nothing to do on it but open felt
// inert. Hover lights it with the dithered spotlight (dither.css) rather
// than lifting it, so nothing on the page shifts under the pointer.
export default function PostingCard({ posting, selected = false, flashUndo = false, onOpen, onStatus, onUndo }) {
  const fresh = isNewToday(posting.firstSeenAt);
  const others = (posting.groupCount || 1) - 1;
  const pay = compactPay(posting.stipend);
  const age = relativeDay(posting.postedAt || posting.firstSeenAt);
  const pinned = selected || flashUndo;

  return (
    <article
      data-row-id={posting.id}
      data-reveal
      aria-current={selected || undefined}
      className={`dither-spot group relative flex flex-col gap-3 rounded-xl border p-4 ${
        selected ? 'border-primary/50 bg-select' : 'border-line bg-panel hover:border-edge'
      } ${posting.status === 'dismissed' ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        aria-label={`${posting.title}, ${posting.company}`}
        onClick={(event) => onOpen(posting, event.currentTarget)}
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />

      <span className="flex items-center gap-3">
        <CompanyMark company={posting.company} size="sm" logoOf={posting.logoUrl ? posting.id : null} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{posting.company}</span>
          <span className="block truncate text-xs text-muted">
            {posting.location || 'Location not listed'}{others > 0 ? ` +${others}` : ''}
          </span>
        </span>
        {fresh && (
          <span aria-label="New today" className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            New
          </span>
        )}
      </span>

      <span className="line-clamp-2 font-display text-base font-bold leading-snug tracking-tight text-ink">{posting.title}</span>

      <PostingTags posting={posting} align="start" />

      {/* mt-auto only on the foot: grid rows stretch to their tallest card, so
          this keeps the rule aligned across a row instead of floating. The
          quick actions live here, in the pay's place while the card is
          hovered, focused inside or selected, the way a row's take its
          score's place. Up beside the company name they covered the New badge
          and the end of long names. */}
      <span className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
        {Number.isInteger(posting.fit)
          ? <FitMeter fit={posting.fit} grade={posting.grade} breakdown={posting.breakdown} />
          : <span className="text-xs text-muted">{age}</span>}
        <span className="relative flex min-h-7 min-w-0 items-center justify-end">
          <span className={`min-w-0 transition-opacity duration-fast ease ${onStatus ? (pinned ? 'invisible' : 'group-focus-within:opacity-0 group-hover:opacity-0') : ''}`}>
            {pay ? <span className="tnum block truncate text-sm font-semibold text-ink">{pay}</span> : <span className="text-xs text-muted">{Number.isInteger(posting.fit) ? age : ''}</span>}
          </span>
          {/* Above the stretched button, so a click here saves or dismisses
              and never opens the job as well. */}
          {onStatus && (
            <span
              className={`absolute inset-y-0 right-0 z-10 flex items-center transition duration-fast ease ${
                pinned ? '' : 'pointer-events-none translate-y-0.5 opacity-0 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100'
              }`}
            >
              <RowActions posting={posting} flashUndo={flashUndo} onStatus={onStatus} onUndo={onUndo} />
            </span>
          )}
        </span>
      </span>
    </article>
  );
}
