import { useEffect, useRef } from 'react';
import PostingCard from './PostingCard.jsx';
import { scrollSelectedIntoView } from '../lib/scrollSelectedIntoView.js';

// Column count is driven by width, not by a fixed track count, so the grid
// reads as 2 up on a phone and 5 up on a wide desktop without a media query
// per breakpoint beyond these.
const COLS = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3';

export default function PostingGrid({ postings, selectedId, onOpen }) {
  const containerRef = useRef(null);

  // j/k works in grid mode too, since it moves over the same rows; the card
  // it lands on has to follow the same way a list row does.
  useEffect(() => {
    if (selectedId) scrollSelectedIntoView(selectedId, containerRef.current);
  }, [selectedId]);

  return (
    <div ref={containerRef} className={COLS} data-testid="posting-grid">
      {postings.map((posting) => (
        <PostingCard key={posting.id} posting={posting} selected={posting.id === selectedId} onOpen={onOpen} />
      ))}
    </div>
  );
}
