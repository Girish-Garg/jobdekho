import { payText, payEvidence } from '../lib/payText.js';
import { ageText, detailNotes, isNew, DOT } from '../lib/postingNotes.js';
import CompanyMark from './CompanyMark.jsx';
import PostingTags from './PostingTags.jsx';
import TagChip from './TagChip.jsx';
import FitMeter from './FitMeter.jsx';
import RowActions from './RowActions.jsx';
import Chip from './ui/Chip.jsx';

// Every row lays its cells on the same tracks, so the tags, the pay and the
// score sit in columns whatever the title beside them did. Two lines rather
// than one: the title gets the whole first line instead of a third of it
// (long titles used to end in an ellipsis on every row), and the company,
// place and age read as one quiet line under it, ending in the notes "Found
// today" and "Few details" where they apply. Below lg the tags and pay
// tracks go rather than squeeze the title. The pay track fits a range in
// the one pay format, "₹15k to ₹20k/mo", without an ellipsis.
const TRACKS =
  'grid items-center gap-x-4 grid-cols-[2.25rem_minmax(0,1fr)_auto] '
  + 'lg:grid-cols-[2.25rem_minmax(0,1fr)_auto_8rem_10.5rem]';

// The selected row keeps a thin saffron bar at its edge as well as the
// surface step: a tint alone read as muddy, and the bar says which one is
// open from across the page.
const SELECTED = 'bg-select before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary';

export default function PostingRow({
  posting, selected, open = false, flashUndo, dominantWorkMode, onOpen, onSelect, onStatus, onUndo,
}) {
  const showActions = open || flashUndo;
  const pay = payText(posting);
  const meta = [posting.company, posting.location || 'Location not listed', ageText(posting), ...detailNotes(posting)];

  // A row that is pointed at or holds focus rises over the rows below it, so
  // the evidence tip under one of its chips is not covered by the next row;
  // the list does not clip its rows (see PostingList.jsx), so the first and
  // the last round their own corners.
  return (
    <div
      data-row-id={posting.id}
      data-reveal
      role="row"
      aria-selected={selected}
      tabIndex={-1}
      onClick={(event) => { onSelect(posting.id); onOpen(posting, event.currentTarget); }}
      className={`dither-spot group relative cursor-pointer border-b border-line px-4 py-3 first:rounded-t-[11px] last:rounded-b-[11px] last:border-b-0 hover:z-10 focus-within:z-10 ${TRACKS} ${
        selected ? SELECTED : 'hover:bg-select/40'
      } ${posting.status === 'dismissed' ? 'opacity-60' : ''}`}
    >
      <span role="gridcell"><CompanyMark company={posting.company} size="sm" logoOf={posting.logoUrl ? posting.id : null} /></span>
      <span role="gridcell" className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[15px] font-semibold leading-snug text-ink">{posting.title}</span>
          {isNew(posting) && <Chip tone="primary" aria-label="New today" className="shrink-0 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide">New</Chip>}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{meta.filter(Boolean).join(DOT)}</span>
      </span>
      <span role="gridcell" className="hidden lg:block">
        <PostingTags posting={posting} dominantWorkMode={dominantWorkMode} />
      </span>
      <span role="gridcell" className="hidden min-w-0 justify-end lg:flex">
        {pay && (
          <TagChip as="span" align="end" hostClassName="min-w-0" evidence={payEvidence(posting)} className="tnum block truncate text-right text-sm font-medium text-ink">
            {pay}
          </TagChip>
        )}
      </span>
      {/* The trailing cell carries the score, and the actions take its place
          while the row is hovered, holds keyboard focus or is open in the
          pane: the same width serves both, and nothing is on screen that a
          person cannot yet act on. Keyboard focus only, as on a card (see
          PostingCardFoot.jsx), and not the j and k highlight, or they stayed
          out on a row whose job had been put away. */}
      <span role="gridcell" className="relative flex h-7 items-center justify-end">
        <span className={`flex items-center ${showActions ? 'invisible' : 'group-hover:invisible group-focus-visible:invisible group-has-[:focus-visible]:invisible'}`}>
          <FitMeter fit={posting.fit} grade={posting.grade} breakdown={posting.breakdown} />
        </span>
        <span className={`absolute inset-y-0 right-0 flex items-center ${showActions ? '' : 'invisible group-hover:visible group-focus-visible:visible group-has-[:focus-visible]:visible'}`}>
          <RowActions posting={posting} flashUndo={flashUndo} onStatus={onStatus} onUndo={onUndo} />
        </span>
      </span>
    </div>
  );
}
