import { toView } from '../lib/applyPoint.js';

// Outlines over the live view: green where JobDekho filled a field, saffron
// where the person is needed, red where the page would not take a value, and
// a saffron frame round the site's own submit button, marked as theirs. Drawn
// over the picture rather than in the page, so the page itself is never
// restyled by JobDekho.
const TONE = {
  filled: 'border-applied bg-applied/10',
  attached: 'border-applied bg-applied/10',
  you: 'border-primary bg-primary/10',
  failed: 'border-ember bg-ember/10',
};

export default function ApplyOverlay({ rows = [], submit, frame, width, hover }) {
  if (!frame || !width) return null;
  const inView = (r) => r.top + r.height > 0 && r.top < frame.h * (width / frame.w);
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {rows.map((row) => {
        const box = row.rect && toView(row.rect, frame, width);
        const tone = TONE[row.status];
        if (!box || !tone || box.width === 0 || !inView(box)) return null;
        return (
          <span
            key={row.fid}
            style={box}
            className={`absolute rounded border-2 transition-opacity duration-fast ease ${tone} ${hover && hover !== row.fid ? 'opacity-40' : 'opacity-100'}`}
          />
        );
      })}
      {submit && (
        <span style={toView(submit, frame, width)} className="absolute rounded-md border-2 border-primary">
          <span className="absolute -top-5 left-0 rounded-full bg-primary px-2 text-[10px] font-bold uppercase tracking-wide text-on-primary">
            Yours
          </span>
        </span>
      )}
    </div>
  );
}
