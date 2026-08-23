import PostingCard from './PostingCard.jsx';

// Column count is driven by width, not by a fixed track count, so the grid
// reads as 2 up on a phone and 5 up on a wide desktop without a media query
// per breakpoint beyond these.
const COLS =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 min-[1180px]:grid-cols-4 min-[1560px]:grid-cols-5';

export default function PostingGrid({ postings, onOpen }) {
  return (
    <div className={COLS} data-testid="posting-grid">
      {postings.map((posting) => (
        <PostingCard key={posting.id} posting={posting} onOpen={onOpen} />
      ))}
    </div>
  );
}
