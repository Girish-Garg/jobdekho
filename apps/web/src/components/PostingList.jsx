import { Fragment, useEffect, useRef } from 'react';
import PostingRow from './PostingRow.jsx';
import GradeBand from './GradeBand.jsx';
import { bandStarts } from '../lib/gradeBands.js';
import { scrollSelectedIntoView } from '../lib/scrollSelectedIntoView.js';
import Card from './ui/Card.jsx';

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

// Each grade opens with its band row (see GradeBand.jsx); `bands` holds how
// many jobs the whole feed has in each, not just the loaded page.
export default function PostingList({ postings, bands = null, selectedId, flashId, onOpen, onSelect, onStatus, onUndo }) {
  const containerRef = useRef(null);
  const dominant = dominantWorkMode(postings);
  const starts = bandStarts(postings);

  useEffect(() => {
    if (selectedId) scrollSelectedIntoView(selectedId, containerRef.current);
  }, [selectedId]);

  return (
    <Card ref={containerRef} variant="list" role="grid" aria-label="Postings" data-testid="posting-list">
      {postings.map((posting) => (
        <Fragment key={posting.id}>
          {starts.has(posting.id) && <GradeBand grade={posting.grade} count={bands?.[posting.grade]} />}
          <PostingRow
            posting={posting}
            selected={posting.id === selectedId}
            flashUndo={posting.id === flashId}
            dominantWorkMode={dominant}
            onOpen={onOpen}
            onSelect={onSelect}
            onStatus={onStatus}
            onUndo={onUndo}
          />
        </Fragment>
      ))}
    </Card>
  );
}
