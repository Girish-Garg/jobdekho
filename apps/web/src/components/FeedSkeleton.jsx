// Rows, not a spinner: a placeholder shaped like the real thing reserves the
// height the results will land in, so the feed does not jump once they
// arrive, and there is nothing to animate but a quiet pulse.
const COUNT = 12;
const BAR = 'animate-pulse rounded-sm bg-line';

function SkeletonRow({ index }) {
  return (
    <div className="flex items-center gap-3 border-b border-l-[3px] border-line border-l-transparent px-3 py-2.5">
      <span className={`h-3.5 w-2/5 ${BAR}`} />
      <span className={`h-3 w-1/6 ${BAR}`} />
      <span className={`hidden h-3 w-1/6 sm:block ${BAR}`} />
      <span className={`ml-auto h-3 w-10 ${BAR}`} style={{ opacity: 1 - (index % 4) * 0.12 }} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex h-40 flex-col gap-2.5 rounded-lg border border-l-[3px] border-line border-l-transparent bg-panel p-4">
      <span className={`h-3 w-1/3 ${BAR}`} />
      <span className={`h-4 w-4/5 ${BAR}`} />
      <span className={`h-3 w-1/2 ${BAR}`} />
      <span className={`mt-auto h-3 w-2/3 ${BAR}`} />
    </div>
  );
}

export default function FeedSkeleton({ mode = 'list' }) {
  const items = Array.from({ length: COUNT }, (_, index) => index);

  if (mode === 'grid') {
    return (
      <div
        aria-hidden="true"
        data-testid="feed-skeleton"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 min-[1180px]:grid-cols-4 min-[1560px]:grid-cols-5"
      >
        {items.map((index) => <SkeletonCard key={index} />)}
      </div>
    );
  }

  return (
    <div aria-hidden="true" data-testid="feed-skeleton">
      {items.map((index) => <SkeletonRow key={index} index={index} />)}
    </div>
  );
}
