import { useState } from 'react';
import { isNewToday } from '../lib/time.js';
import { usePostingsFeed } from '../lib/usePostingsFeed.js';
import { useViewMode } from '../lib/viewMode.js';
import { useMediaQuery } from '../lib/useMediaQuery.js';
import { useTriage } from '../lib/useTriage.js';
import { useOpenPosting } from '../lib/useOpenPosting.js';
import { useListKeys } from '../lib/useListKeys.js';
import PostingsHeader from './PostingsHeader.jsx';
import FeedBody from './FeedBody.jsx';
import PostingDetailSlot from './PostingDetailSlot.jsx';
import RecommendedNotice from './RecommendedNotice.jsx';
import DensityToggle from './DensityToggle.jsx';

// Below this the pane has nowhere to sit beside the list, so a dialog takes
// over instead; the chrome agent's own breakpoints are unrelated.
const WIDE_QUERY = '(min-width: 1100px)';

export default function PostingsView({ filters, onOpenProfile }) {
  // Best fit by default: the feed opens personalised, and the other sorts
  // reorder the same ranked, fit-filtered set rather than replacing it.
  const [sort, setSort] = useState('match');
  const [viewMode, setViewMode] = useViewMode();
  const { rows, loading, more, loadMore, onStatus } = usePostingsFeed(filters, sort);
  const triage = useTriage(rows, onStatus);
  const isWide = useMediaQuery(WIDE_QUERY);
  const { opened, openFromClick: openRow, openById, close: closeCard } = useOpenPosting(rows);

  // The notice fires wherever the UI claims a ranking the server is not
  // doing: best-fit order, or a fit floor, which the server ignores with no
  // profile to score against.
  const fitFiltered = Boolean(filters.minFit);
  const claimsRanking = sort === 'match' || fitFiltered;
  const serverRanked = rows.some((row) => Number.isInteger(row.fit));
  const unranked = claimsRanking && rows.length > 0 && !serverRanked;

  // Selection (keyboard highlight) is separate from "open": only Enter or a
  // click commits to viewing a posting.
  const [selectedId, setSelectedId] = useState(null);

  function openFromClick(posting, element) {
    setSelectedId(posting.id);
    openRow(posting, element);
  }

  useListKeys({
    rows,
    selectedId,
    onSelect: setSelectedId,
    onOpen: openById,
    onStatus: triage.setStatus,
    onUndo: triage.undo,
    onClear: () => setSelectedId(null),
  });

  return (
    <section>
      <PostingsHeader
        shown={rows.length}
        fresh={rows.filter((p) => isNewToday(p.firstSeenAt)).length}
        sort={sort}
        setSort={setSort}
      >
        <DensityToggle mode={viewMode} setMode={setViewMode} />
      </PostingsHeader>
      <div className="flex gap-4 px-4 py-2">
        <div className="min-w-0 flex-1">
          {unranked && (
            <div className="pb-5">
              <RecommendedNotice fitFiltered={fitFiltered} onOpenProfile={onOpenProfile} />
            </div>
          )}
          <FeedBody
            loading={loading}
            rows={rows}
            viewMode={viewMode}
            filters={filters}
            selectedId={selectedId}
            flashId={triage.flashId}
            onOpen={openFromClick}
            onSelect={setSelectedId}
            onStatus={triage.setStatus}
            onUndo={triage.undo}
          />
          {!loading && more && (
            <div className="pt-6">
              <button
                onClick={loadMore}
                className="rounded-full border border-line px-5 py-2 font-mono text-xs text-muted transition hover:border-ink hover:text-ink"
              >
                Load more
              </button>
            </div>
          )}
        </div>
        <PostingDetailSlot isWide={isWide} opened={opened} onClose={closeCard} onStatus={triage.setStatus} />
      </div>
    </section>
  );
}
