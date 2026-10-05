import { useEffect, useId, useRef, useState } from 'react';
import { applyLabel, countLabels, summaryLine } from '../lib/reviewText.js';
import { reviewGroups, roomLeft, withinRoom } from '../lib/reviewGroups.js';
import { CAPPED } from '../lib/resumeFitRows.js';
import { motionAllowed } from '../lib/smoothScroll.js';
import ReviewGroup from './ReviewGroup.jsx';
import ReviewUnchanged from './ReviewUnchanged.jsx';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import Chip from './ui/Chip.jsx';

// What the resume would change, for the person to pick from (see
// resumeReview.js for what is offered and what is ticked from the start).
// Nothing here touches the record until Apply, and Apply only changes it on
// the page: the save bar that follows is what writes it, the same as for a
// hand edit. Discard leaves the record as it was. Raised over the record,
// since it is the one thing on the page waiting on a decision, and brought
// into view when it arrives, as the button that asked for it sits in the
// rail and the record may be scrolled anywhere.
export default function ResumeReview({ review, onApply, onDiscard }) {
  const { rows, room } = review;
  const [picked, setPicked] = useState(() => new Set(rows.filter((row) => row.ticked).map((row) => row.id)));
  const ref = useRef(null);
  const headingId = useId();

  useEffect(() => {
    const top = ref.current?.getBoundingClientRect().top ?? 0;
    if (top >= 0 && top < window.innerHeight / 2) return;
    ref.current?.scrollIntoView?.({ block: 'start', behavior: motionAllowed(window) ? 'smooth' : 'auto' });
  }, []);

  // Ticking more than Best fit has room for gives way at once (see
  // withinRoom), so the count on Apply is always what Apply will do.
  function set(ids, on) {
    setPicked((was) => {
      const next = new Set(was);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return withinRoom(rows, next, room);
    });
  }
  const isLocked = (row) => row.section === 'fit' && row.kind === 'new' && CAPPED.includes(row.field)
    && !picked.has(row.id) && roomLeft(rows, picked, room, row.field) <= 0;

  return (
    <Card as="section" ref={ref} variant="pop" aria-labelledby={headingId} className="scroll-mt-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 id={headingId} className="font-display text-lg font-bold tracking-tight text-ink">From your resume</h3>
          <p className="mt-0.5 text-sm text-muted">{summaryLine(review)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5 pt-1">
          {countLabels(rows).map((count) => (
            <Chip key={count.kind} tone={count.kind === 'new' ? 'primary' : 'quiet'} className={count.kind === 'new' ? 'bg-primary/15' : ''}>
              {count.text}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {reviewGroups(rows).map((group) => (
          <ReviewGroup key={group.key} group={group} picked={picked} onSet={set} isLocked={isLocked} />
        ))}
        <ReviewUnchanged same={review.same} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button variant="primary" disabled={picked.size === 0} onClick={() => onApply(rows.filter((row) => picked.has(row.id)))} className="px-5 py-2">
          {applyLabel(picked.size)}
        </Button>
        <Button onClick={onDiscard} className="px-4 py-2 font-normal">Discard</Button>
        <span className="ml-auto text-xs text-muted">Then press Save profile to keep them</span>
      </div>
    </Card>
  );
}
