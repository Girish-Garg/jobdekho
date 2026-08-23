import { useRef, useState } from 'react';
import { isNewToday } from '../lib/time.js';
import { usePostingsFeed } from '../lib/usePostingsFeed.js';
import PostingsHeader from './PostingsHeader.jsx';
import PostingGrid from './PostingGrid.jsx';
import PostingDialog from './PostingDialog.jsx';
import RecommendedNotice from './RecommendedNotice.jsx';

export default function PostingsView({ filters, onOpenProfile }) {
  // Best fit by default: the feed opens personalised, and the other sorts
  // reorder the same ranked, fit-filtered set rather than replacing it.
  const [sort, setSort] = useState('match');
  const { rows, loading, more, loadMore, onStatus } = usePostingsFeed(filters, sort);
  // The notice has to fire wherever the UI claims a ranking the server is not
  // doing: the best-fit order, and a fit floor, which the server ignores with
  // no profile to score against - a control that visibly does nothing reads
  // as broken rather than as a step still to do.
  const fitFiltered = Boolean(filters.minFit);
  const claimsRanking = sort === 'match' || fitFiltered;
  // The rows themselves say whether the server ranked: fit rides every row
  // when it did and is absent when it did not, which also covers a profile
  // with nothing rankable in it - a case a profile fetch could not tell
  // apart. An empty page cannot answer either way, and the no-matches copy
  // already owns that state; the same guard keeps the banner from flashing
  // while the first page is still in flight.
  const serverRanked = rows.some((row) => Number.isInteger(row.fit));
  const unranked = claimsRanking && rows.length > 0 && !serverRanked;
  const [openId, setOpenId] = useState(null);
  // Focus has to land back on the exact card that opened the overlay, and the
  // card is not remounted, so the element itself is the cheapest handle.
  const openerRef = useRef(null);

  const opened = rows.find((row) => row.id === openId) || null;

  function openCard(posting, element) {
    openerRef.current = element;
    setOpenId(posting.id);
  }

  function closeCard() {
    setOpenId(null);
    openerRef.current?.focus();
  }

  return (
    <section>
      <PostingsHeader
        shown={rows.length}
        fresh={rows.filter((p) => isNewToday(p.firstSeenAt)).length}
        sort={sort}
        setSort={setSort}
      />
      <div className="px-6 py-5">
        {unranked && (
          <div className="pb-5">
            <RecommendedNotice fitFiltered={fitFiltered} onOpenProfile={onOpenProfile} />
          </div>
        )}
        {loading ? (
          <p className="py-10 font-mono text-sm text-muted">Fetching postings...</p>
        ) : rows.length === 0 ? (
          <p className="py-10 font-mono text-sm text-muted">Nothing matches these filters yet.</p>
        ) : (
          <PostingGrid postings={rows} onOpen={openCard} />
        )}
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
      {opened && <PostingDialog posting={opened} onClose={closeCard} onStatus={onStatus} />}
    </section>
  );
}
