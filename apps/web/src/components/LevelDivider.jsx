import Eyebrow from './ui/Eyebrow.jsx';

// Where the postings that do not say their level begin, under a seniority
// filter. The server keeps them after every confirmed one rather than
// hiding them (see the store's level-unstated.js), so nothing real is lost
// to the filter; this only says where the part begins. Quiet on purpose: a
// break in the list, not a warning. `count` is the whole feed's, not the
// loaded page's. `as` is 'row' inside the list's grid and 'heading' across
// the card grid, as GradeBand.jsx does.
export default function LevelDivider({ count, as = 'row' }) {
  const face = (
    <>
      <Eyebrow as="span">Level not stated</Eyebrow>
      {Number.isInteger(count) && <span className="tnum text-muted">{count.toLocaleString('en-IN')} {count === 1 ? 'job' : 'jobs'}</span>}
      <span aria-hidden="true" className="h-px min-w-6 flex-1 bg-line" />
    </>
  );

  if (as === 'heading') {
    return <h3 className="col-span-full flex items-center gap-2 pt-4 text-xs first:pt-0">{face}</h3>;
  }
  return (
    <div role="row" className="border-b border-line bg-paper/60 px-4 pb-2 pt-3 first:rounded-t-[11px]">
      <span role="columnheader" className="flex items-center gap-2 text-xs">{face}</span>
    </div>
  );
}
