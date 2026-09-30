import FilterBar from './FilterBar.jsx';
import PostingsHeader from './PostingsHeader.jsx';
import DensityToggle from './DensityToggle.jsx';
import SortSelect from './SortSelect.jsx';
import SetupNotice from './SetupNotice.jsx';

// Everything above the rows. The filters sit in the feed's own column rather
// than in a full-width band of chrome: in the band they started at the
// window's left edge while the feed below was centred, so the two never lined
// up, and a pinned chat panel moved one and not the other. Sticky, so a
// filter is always one click away however far down the feed is read, and a
// card of its own, frosted, so the rows passing under it stay out of the way.
// Under the title, the setup banner while something required is missing.
export default function FeedTop({ filters, setFilters, sort, setSort, viewMode, setViewMode, shown, total, fresh, onOpenSettings }) {
  return (
    <>
      <div className="sticky top-2 z-20 mt-3 rounded-2xl border border-line bg-panel/85 p-1.5 shadow-raise backdrop-blur-md">
        <FilterBar filters={filters} setFilters={setFilters} />
      </div>
      <PostingsHeader
        shown={shown}
        total={total}
        fresh={fresh}
        controls={(
          <>
            <DensityToggle mode={viewMode} setMode={setViewMode} />
            <SortSelect sort={sort} setSort={setSort} />
          </>
        )}
      />
      <SetupNotice onOpenSettings={onOpenSettings} />
    </>
  );
}
