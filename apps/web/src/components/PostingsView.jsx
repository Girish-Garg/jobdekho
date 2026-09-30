import { useState } from 'react';
import { usePostingsFeed } from '../lib/usePostingsFeed.js';
import { useMediaQuery } from '../lib/useMediaQuery.js';
import { useTriage } from '../lib/useTriage.js';
import { useOpenPosting } from '../lib/useOpenPosting.js';
import { useListKeys } from '../lib/useListKeys.js';
import { rankingNotice } from '../lib/rankingNotice.js';
import FeedTop from './FeedTop.jsx';
import FeedBody from './FeedBody.jsx';
import PostingDetailSlot from './PostingDetailSlot.jsx';
import RecommendedNotice from './RecommendedNotice.jsx';

// Below this the pane has nowhere to sit beside the list, so a dialog takes
// over instead.
const WIDE_QUERY = '(min-width: 1100px)';

// Filters, sort and density live in Shell, where the command palette and the
// chat change them too; this view shows and sets them (see FeedTop.jsx). The
// defaults are what a fresh install shows.
export default function PostingsView({
  filters, setFilters, sort = 'match', setSort, viewMode = 'list', setViewMode, onOpenProfile,
}) {
  const { rows, loading, more, loadMore, onStatus, total, newToday } = usePostingsFeed(filters, sort);
  const triage = useTriage(rows, onStatus);
  const isWide = useMediaQuery(WIDE_QUERY);
  const { opened, openFromClick: openRow, openById, close: closeCard, dismiss, patchOutside } = useOpenPosting(rows);
  const { fitFiltered, unranked } = rankingNotice(filters, sort, rows);

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
    onClear: () => (opened ? closeCard() : setSelectedId(null)),
  });

  // The feed keeps the Profile page's width, centred, rather than running
  // edge to edge: full-width rows and cards spread a title, its company and
  // its fit too far apart to read as one line on a wide screen.
  return (
    <section className="flex gap-4 px-4 pb-10">
      <div className="mx-auto w-full min-w-0 max-w-[84rem]">
        <FeedTop
          filters={filters} setFilters={setFilters} sort={sort} setSort={setSort} viewMode={viewMode} setViewMode={setViewMode}
          shown={rows.length} total={total} fresh={newToday}
        />
        {unranked && (
          <div className="pb-4">
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
          <div className="flex justify-center pt-6">
            <button
              onClick={loadMore}
              className="rounded-full border border-line bg-panel px-6 py-2 text-sm font-medium text-ink transition-colors duration-fast ease hover:border-primary/50 hover:text-primary"
            >
              Load more
            </button>
          </div>
        )}
      </div>
      <PostingDetailSlot
        isWide={isWide}
        opened={opened}
        onClose={closeCard}
        onDismiss={dismiss}
        onStatus={(id, value) => { patchOutside(id, value); triage.setStatus(id, value); }}
      />
    </section>
  );
}
