import { BAND_WORDS } from '../lib/gradeBands.js';
import { gradeTone } from '../lib/gradeTone.js';

// Where one grade's jobs begin in the feed: the letter in its tone, what it
// means in a word or two, and how many jobs the whole feed holds in it (not
// just those loaded so far). `as` is 'row' inside the list's grid and
// 'heading' across the card grid, which reads it as a section heading.
export default function GradeBand({ grade, count, as = 'row' }) {
  const tone = gradeTone(grade);
  const face = (
    <>
      <span className={`grid h-5 w-5 place-items-center rounded-md text-[11px] font-bold ${tone.soft} ${tone.text}`}>{grade}</span>
      <span className="font-semibold text-ink">{BAND_WORDS[grade] ?? grade}</span>
      {Number.isInteger(count) && <span className="tnum text-muted">{count} {count === 1 ? 'job' : 'jobs'}</span>}
    </>
  );

  if (as === 'heading') {
    return <h3 className="col-span-full flex items-center gap-2 pt-2 text-xs first:pt-0">{face}</h3>;
  }
  return (
    <div role="row" className="border-b border-line bg-select/40 px-4 py-2">
      <span role="columnheader" className="flex items-center gap-2 text-xs">{face}</span>
    </div>
  );
}
