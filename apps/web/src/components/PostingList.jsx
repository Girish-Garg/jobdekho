import { useEffect, useRef } from 'react';
import PostingRow from './PostingRow.jsx';
import FeedMarks from './FeedMarks.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import BrokenPosting from './BrokenPosting.jsx';
import { feedMarks } from '../lib/gradeBands.js';
import { scrollSelectedIntoView } from '../lib/scrollSelectedIntoView.js';
import Card from './ui/Card.jsx';

// The mode most rows on screen share is not information; only a row that
// differs from the rest of the page is worth a word for it. Most means more
// than half of the page: a posting that does not say its mode has none, and
// the commonest stated mode among a few could otherwise hide the very rows
// it was stated on.
function dominantWorkMode(postings) {
  const counts = {};
  for (const posting of postings) {
    if (posting.workMode) counts[posting.workMode] = (counts[posting.workMode] || 0) + 1;
  }
  const [top, count = 0] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? [];
  return count * 2 > postings.length ? top : null;
}

// Each grade opens with its band row (see GradeBand.jsx), and under a level
// filter the postings that do not say their level open with their own
// divider (see FeedMarks.jsx). `bands` holds how many jobs the whole feed
// has in each grade and `notStated` how many it has that state no level,
// not just the loaded page's.
//
// The list does not clip its rows, or the evidence tips of its last row
// would be cut off at its edge, so its first and last rows round their own
// corners instead. A row that cannot be drawn says so in its place and the
// rest of the feed goes on (see BrokenPosting.jsx); a fresh copy of the
// posting (a reload of the feed, a status change) draws it again.
export default function PostingList({ postings, bands = null, notStated = null, selectedId, openId = null, flashId, onOpen, onSelect, onStatus, onUndo }) {
  const containerRef = useRef(null);
  const dominant = dominantWorkMode(postings);
  const marks = feedMarks(postings, bands, notStated);

  useEffect(() => {
    if (selectedId) scrollSelectedIntoView(selectedId, containerRef.current);
  }, [selectedId]);

  return (
    <Card ref={containerRef} variant="list" role="grid" aria-label="Postings" data-testid="posting-list" className="overflow-visible">
      {postings.map((posting) => (
        <ErrorBoundary
          key={posting.id}
          where={`the posting ${posting.id} in the feed`}
          resetKey={posting}
          fallback={({ report }) => <BrokenPosting posting={posting} report={report} />}
        >
          <FeedMarks posting={posting} marks={marks} />
          <PostingRow
            posting={posting}
            selected={posting.id === selectedId}
            open={posting.id === openId}
            flashUndo={posting.id === flashId}
            dominantWorkMode={dominant}
            onOpen={onOpen}
            onSelect={onSelect}
            onStatus={onStatus}
            onUndo={onUndo}
          />
        </ErrorBoundary>
      ))}
    </Card>
  );
}
