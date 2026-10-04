import { activeChips } from '../lib/activeChips.js';
import { emptyFeedMessage } from '../lib/emptyFeedMessage.js';
import PostingList from './PostingList.jsx';
import PostingGrid from './PostingGrid.jsx';
import FeedSkeleton from './FeedSkeleton.jsx';
import { SearchIcon } from './Icon.jsx';

// The area under the header: a skeleton, a reason nothing matched, or the
// rows/cards themselves - never more than one of the three at once.
// `bands` and `notStated` are the whole feed's counts for the dividers: how
// many jobs in each grade, and how many that do not say their level under a
// seniority filter (see FeedMarks.jsx).
export default function FeedBody({
  loading, rows, bands = null, notStated = null, viewMode, filters, selectedId, openId = null, flashId, onOpen, onSelect, onStatus, onUndo,
}) {
  if (loading) return <FeedSkeleton mode={viewMode} />;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-edge bg-panel/60 px-6 py-14 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-select text-muted"><SearchIcon size={16} /></span>
        <p className="max-w-md text-sm text-muted">{emptyFeedMessage(activeChips(filters))}</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <PostingGrid
        postings={rows}
        bands={bands}
        notStated={notStated}
        selectedId={selectedId}
        openId={openId}
        flashId={flashId}
        onOpen={onOpen}
        onStatus={onStatus}
        onUndo={onUndo}
      />
    );
  }

  return (
    <PostingList
      postings={rows}
      bands={bands}
      notStated={notStated}
      selectedId={selectedId}
      openId={openId}
      flashId={flashId}
      onOpen={onOpen}
      onSelect={onSelect}
      onStatus={onStatus}
      onUndo={onUndo}
    />
  );
}
