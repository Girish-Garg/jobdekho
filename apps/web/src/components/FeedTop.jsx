import FilterBar from './FilterBar.jsx';
import PostingsHeader from './PostingsHeader.jsx';
import DensityToggle from './DensityToggle.jsx';
import SortSelect from './SortSelect.jsx';

// Everything above the rows. The filters sit in the feed's own column rather
// than in a full-width band of chrome: in the band they started at the
// window's left edge while the feed below was centred, so the two never lined
// up, and a pinned chat panel moved one and not the other. Sticky, so a
// filter is always one click away however far down the feed is read.
export default function FeedTop({ filters, setFilters, sort, setSort, viewMode, setViewMode, shown, fresh }) {
  return (
    <>
      <div className="sticky top-0 z-20 -mx-1 border-b border-line bg-paper/90 px-1 py-2.5 backdrop-blur">
        <FilterBar filters={filters} setFilters={setFilters} />
      </div>
      <PostingsHeader
        shown={shown}
        fresh={fresh}
        controls={(
          <>
            <DensityToggle mode={viewMode} setMode={setViewMode} />
            <SortSelect sort={sort} setSort={setSort} />
          </>
        )}
      />
    </>
  );
}
