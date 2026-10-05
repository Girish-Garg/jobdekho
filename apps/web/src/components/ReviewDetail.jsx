import { detailLines } from '../lib/reviewLines.js';
import Eyebrow from './ui/Eyebrow.jsx';

// Struck in ember for what leaves the profile, lit in the applied green for
// what the resume brings: the two states those colours are kept for.
const MARKS = { gone: 'text-ember line-through', added: 'text-applied' };

function Side({ row, side, title }) {
  const lines = detailLines(row, side);
  const mine = side === 'mine';
  return (
    <div className={`min-w-0 ${mine ? 'text-muted' : 'text-ink'}`}>
      <Eyebrow className="mb-1">{title}</Eyebrow>
      {lines.length === 0 && <p className="text-muted">Nothing more than its name</p>}
      {lines.map((line, at) => (
        <p key={line.key} className={`break-words ${line.kind === 'point' && at > 0 && lines[at - 1].kind !== 'point' ? 'mt-1' : ''}`}>
          {line.kind === 'point' && <span aria-hidden="true">· </span>}
          {line.parts.map((part, i) => (
            <span key={i} className={MARKS[part.mark] ?? ''}>{part.text}</span>
          ))}
        </p>
      ))}
    </div>
  );
}

// What one entry row would do, opened from its chevron. A Newer row sets
// the profile's version beside the resume's; a new entry shows only the
// resume's, and a removal only what is on the profile.
export default function ReviewDetail({ row, id }) {
  const both = row.kind === 'newer';
  return (
    <div id={id} className={`mt-2 grid gap-3 rounded-lg bg-select/60 p-3 text-xs sm:ml-[46px] ${both ? 'sm:grid-cols-2' : ''}`}>
      {(both || row.kind === 'remove') && <Side row={row} side="mine" title="On your profile" />}
      {row.kind !== 'remove' && <Side row={row} side="theirs" title="On the resume" />}
    </div>
  );
}
