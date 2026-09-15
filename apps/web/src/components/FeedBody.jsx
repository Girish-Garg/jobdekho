import { activeChips } from '../lib/activeChips.js';
import { emptyFeedMessage } from '../lib/emptyFeedMessage.js';
import PostingList from './PostingList.jsx';
import PostingGrid from './PostingGrid.jsx';
import FeedSkeleton from './FeedSkeleton.jsx';

// The area under the header: a skeleton, a reason nothing matched, or the
// rows/cards themselves - never more than one of the three at once.
export default function FeedBody({
  loading, rows, viewMode, filters, selectedId, flashId, onOpen, onSelect, onStatus, onUndo,
}) {
  if (loading) return <FeedSkeleton mode={viewMode} />;

  if (rows.length === 0) {
    return <p className="py-10 text-base text-muted">{emptyFeedMessage(activeChips(filters))}</p>;
  }

  if (viewMode === 'grid') {
    return <PostingGrid postings={rows} selectedId={selectedId} onOpen={onOpen} />;
  }

  return (
    <PostingList
      postings={rows}
      selectedId={selectedId}
      flashId={flashId}
      onOpen={onOpen}
      onSelect={onSelect}
      onStatus={onStatus}
      onUndo={onUndo}
    />
  );
}
