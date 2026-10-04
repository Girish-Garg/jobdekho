import { Fragment, useEffect, useRef } from 'react';
import PostingCard from './PostingCard.jsx';
import FeedMarks from './FeedMarks.jsx';
import { feedMarks } from '../lib/gradeBands.js';
import { scrollSelectedIntoView } from '../lib/scrollSelectedIntoView.js';

// Column count is driven by width, not by a fixed track count, so the grid
// reads as 2 up on a phone and 5 up on a wide desktop without a media query
// per breakpoint beyond these.
const COLS = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3';

// The same status handlers the list rows take, so a card saves, marks applied
// or dismisses (with its undo) from under the pointer, as a row does. The
// bands and the "Level not stated" divider head the cards the way they
// divide the list (see FeedMarks.jsx).
export default function PostingGrid({ postings, bands = null, notStated = null, selectedId, openId = null, flashId, onOpen, onStatus, onUndo }) {
  const containerRef = useRef(null);
  const marks = feedMarks(postings, bands, notStated);

  // j/k works in grid mode too, since it moves over the same rows; the card
  // it lands on has to follow the same way a list row does.
  useEffect(() => {
    if (selectedId) scrollSelectedIntoView(selectedId, containerRef.current);
  }, [selectedId]);

  return (
    <div ref={containerRef} className={COLS} data-testid="posting-grid">
      {postings.map((posting) => (
        <Fragment key={posting.id}>
          <FeedMarks posting={posting} marks={marks} as="heading" />
          <PostingCard
            posting={posting}
            selected={posting.id === selectedId}
            open={posting.id === openId}
            flashUndo={posting.id === flashId}
            onOpen={onOpen}
            onStatus={onStatus}
            onUndo={onUndo}
          />
        </Fragment>
      ))}
    </div>
  );
}
