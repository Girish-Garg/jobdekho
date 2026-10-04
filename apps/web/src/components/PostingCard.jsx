import { useRef } from 'react';
import { detailNotes, isNew, DOT } from '../lib/postingNotes.js';
import CompanyMark from './CompanyMark.jsx';
import PostingTags from './PostingTags.jsx';
import PostingCardFoot from './PostingCardFoot.jsx';
import Card from './ui/Card.jsx';
import Chip from './ui/Chip.jsx';

// A card is a scan unit, so it carries only the fields candidates are sorted
// by: who (monogram, company, place), what (the title), the tags, and at the
// foot the score and the pay (PostingCardFoot.jsx). The description lives in
// the pane: on the card it turned every tile into a wall of grey text and
// killed the scan. The place line ends in "Found today" and "Few details"
// where they apply, as a row's details line does.
//
// The whole card opens the job through one button stretched over it, and the
// quick actions sit above that button as buttons of their own: a button
// cannot hold buttons, and a card with nothing to do on it but open felt
// inert. The tags sit above it too, so their evidence can be pointed at, and
// a press on them still opens the job; they sit above the foot as well, or
// the tip under a chip was drawn beneath the quick actions and the pay. The
// quick actions stay out while this job is `open` in the pane (see
// PostingCardFoot.jsx). Hover lights the card with the dithered spotlight
// (dither.css) rather than lifting it, so nothing on the page shifts under
// the pointer; it also raises the card, so a tip under a chip is not covered
// by the card below.
export default function PostingCard({ posting, selected = false, open = false, flashUndo = false, onOpen, onStatus, onUndo }) {
  const openRef = useRef(null);
  const others = (posting.groupCount || 1) - 1;
  const place = `${posting.location || 'Location not listed'}${others > 0 ? ` +${others}` : ''}`;
  const openHere = () => onOpen(posting, openRef.current);

  return (
    <Card
      as="article"
      variant="panel"
      data-row-id={posting.id}
      data-reveal
      aria-current={selected || undefined}
      className={`dither-spot group relative flex flex-col gap-3 rounded-xl p-4 hover:z-10 focus-within:z-10 ${
        selected ? 'border-primary/50 bg-select' : 'hover:border-edge'
      } ${posting.status === 'dismissed' ? 'opacity-50' : ''}`}
    >
      <button
        ref={openRef}
        type="button"
        aria-label={`${posting.title}, ${posting.company}`}
        onClick={(event) => onOpen(posting, event.currentTarget)}
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />

      <span className="flex items-center gap-3">
        <CompanyMark company={posting.company} size="sm" logoOf={posting.logoUrl ? posting.id : null} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{posting.company}</span>
          <span className="block truncate text-xs text-muted">{[place, ...detailNotes(posting)].join(DOT)}</span>
        </span>
        {isNew(posting) && (
          <Chip tone="primary" aria-label="New today" className="shrink-0 text-[10px] font-bold uppercase tracking-wide">
            New
          </Chip>
        )}
      </span>

      <span className="line-clamp-2 font-display text-base font-bold leading-snug tracking-tight text-ink">{posting.title}</span>

      <span className="relative z-20" onClick={openHere}>
        <PostingTags posting={posting} align="start" />
      </span>

      <PostingCardFoot posting={posting} pinned={open || flashUndo} onOpen={openHere} onStatus={onStatus} onUndo={onUndo} flashUndo={flashUndo} />
    </Card>
  );
}
