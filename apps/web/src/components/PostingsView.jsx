import { useState } from 'react';
import { isNewToday } from '../lib/time.js';
import { usePostingsFeed } from '../lib/usePostingsFeed.js';
import { useMediaQuery } from '../lib/useMediaQuery.js';
import { useTriage } from '../lib/useTriage.js';
import { useOpenPosting } from '../lib/useOpenPosting.js';
import { useListKeys } from '../lib/useListKeys.js';
import { rankingNotice } from '../lib/rankingNotice.js';
import PostingsHeader from './PostingsHeader.jsx';
import FeedBody from './FeedBody.jsx';
import PostingDetailSlot from './PostingDetailSlot.jsx';
import RecommendedNotice from './RecommendedNotice.jsx';

// Below this the pane has nowhere to sit beside the list, so a dialog takes
// over instead.
const WIDE_QUERY = '(min-width: 1100px)';

// Sort and density are read here and set in the chrome: their controls sit
// in the filter row beside the filters they belong with, and the command
// palette changes the sort as well, so the state lives in Shell where all
// three can reach it. The defaults are what a fresh install shows.
export default function PostingsView({ filters, sort = 'match', viewMode = 'list', onOpenProfile }) {
  const { rows, loading, more, loadMore, onStatus } = usePostingsFeed(filters, sort);
  const triage = useTriage(rows, onStatus);
  const isWide = useMediaQuery(WIDE_QUERY);
  const { opened, openFromClick: openRow, openById, close: closeCard, patchOutside } = useOpenPosting(rows);
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

  // The feed keeps a reading width, centred, rather than running edge to
  // edge: full-width rows and cards spread a title, its company and its fit
  // too far apart to read as one line, and the empty sides are where the
  // chat and the job pane float without covering a card.
  return (
    <section className="flex gap-4 px-4 py-2">
      <div className="mx-auto w-full min-w-0 max-w-[68rem]">
        <PostingsHeader shown={rows.length} fresh={rows.filter((p) => isNewToday(p.firstSeenAt)).length} />
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
          <div className="pt-6">
            <button
              onClick={loadMore}
              className="rounded-md border border-line px-4 py-1.5 text-sm text-muted transition-colors duration-fast ease hover:border-edge hover:text-ink"
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
        onStatus={(id, value) => { patchOutside(id, value); triage.setStatus(id, value); }}
      />
    </section>
  );
}
