import Card from './ui/Card.jsx';

// Rows, not a spinner: a placeholder shaped like the real thing reserves the
// height the results will land in, so the feed does not jump once they
// arrive, and there is nothing to animate but a quiet pulse. Shaped like the
// two-line row and the card, monogram included.
const COUNT = 12;
const BAR = 'animate-pulse rounded-full bg-line';
const MARK = 'h-9 w-9 shrink-0 animate-pulse rounded-lg bg-line';

function SkeletonRow({ index }) {
  return (
    <div className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0">
      <span className={MARK} />
      <span className="flex flex-1 flex-col gap-2">
        <span className={`h-3.5 w-2/5 ${BAR}`} />
        <span className={`h-3 w-1/3 ${BAR}`} />
      </span>
      <span className={`h-3 w-16 ${BAR}`} style={{ opacity: 1 - (index % 4) * 0.12 }} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card variant="panel" className="flex h-48 flex-col gap-3 rounded-xl p-4">
      <span className="flex items-center gap-3">
        <span className={MARK} />
        <span className={`h-3 w-1/3 ${BAR}`} />
      </span>
      <span className={`h-4 w-4/5 ${BAR}`} />
      <span className={`h-3 w-1/2 ${BAR}`} />
      <span className={`mt-auto h-3 w-2/3 ${BAR}`} />
    </Card>
  );
}

export default function FeedSkeleton({ mode = 'list' }) {
  const items = Array.from({ length: COUNT }, (_, index) => index);

  if (mode === 'grid') {
    return (
      <div aria-hidden="true" data-testid="feed-skeleton" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((index) => <SkeletonCard key={index} />)}
      </div>
    );
  }

  return (
    <Card variant="list" aria-hidden="true" data-testid="feed-skeleton">
      {items.map((index) => <SkeletonRow key={index} index={index} />)}
    </Card>
  );
}
