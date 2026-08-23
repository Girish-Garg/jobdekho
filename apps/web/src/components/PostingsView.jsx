import { useRef, useState } from 'react';
import { isNewToday } from '../lib/time.js';
import { usePostingsFeed } from '../lib/usePostingsFeed.js';
import { useProfile } from '../lib/useProfile.js';
import PostingsHeader from './PostingsHeader.jsx';
import PostingGrid from './PostingGrid.jsx';
import PostingDialog from './PostingDialog.jsx';
import RecommendedNotice from './RecommendedNotice.jsx';

export default function PostingsView({ filters, onOpenProfile }) {
  const [sort, setSort] = useState('newest');
  const { rows, loading, more, loadMore, onStatus } = usePostingsFeed(filters, sort);
  // Fetched once here, not per card: the match reasons in the overlay and the
  // no-profile notice both read it, and only the match sort needs it at all.
  const ranking = sort === 'match';
  const profile = useProfile(ranking);
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
        {ranking && profile === null && (
          <div className="pb-5">
            <RecommendedNotice onOpenProfile={onOpenProfile} />
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
      {opened && (
        <PostingDialog
          posting={opened}
          profile={ranking ? profile : null}
          onClose={closeCard}
          onStatus={onStatus}
        />
      )}
    </section>
  );
}
