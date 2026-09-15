import { useEffect, useRef } from 'react';
import PostingRow from './PostingRow.jsx';
import { scrollSelectedIntoView } from '../lib/scrollSelectedIntoView.js';

// The mode nearly every row on screen shares is not information; only a row
// that differs from the rest of the page is worth a word for it.
function dominantWorkMode(postings) {
  const counts = {};
  for (const posting of postings) {
    if (posting.workMode) counts[posting.workMode] = (counts[posting.workMode] || 0) + 1;
  }
  let top = null;
  let max = 0;
  for (const [mode, count] of Object.entries(counts)) {
    if (count > max) {
      top = mode;
      max = count;
    }
  }
  return top;
}

export default function PostingList({ postings, selectedId, flashId, onOpen, onSelect, onStatus, onUndo }) {
  const containerRef = useRef(null);
  const dominant = dominantWorkMode(postings);

  useEffect(() => {
    if (selectedId) scrollSelectedIntoView(selectedId, containerRef.current);
  }, [selectedId]);

  return (
    <div ref={containerRef} role="grid" aria-label="Postings" data-testid="posting-list">
      {postings.map((posting) => (
        <PostingRow
          key={posting.id}
          posting={posting}
          selected={posting.id === selectedId}
          flashUndo={posting.id === flashId}
          dominantWorkMode={dominant}
          onOpen={onOpen}
          onSelect={onSelect}
          onStatus={onStatus}
          onUndo={onUndo}
        />
      ))}
    </div>
  );
}
