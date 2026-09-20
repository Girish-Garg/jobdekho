import { versionsOf } from '../lib/usePostingAction.js';

const BASE = 'rounded-full border px-2.5 py-0.5 font-mono text-xs transition';
const CURRENT = `${BASE} border-ink text-ink`;
const OTHER = `${BASE} border-line text-muted hover:border-ink hover:text-ink`;

// Every answer an action has produced for this posting, kept rather than
// thrown away on the next run or refine: a click shows that one, and its
// title carries the instruction that produced it (blank for a first run or
// a plain rerun) so the strip means something before it is clicked. Nothing
// to show for a record with only one answer, which is the common case and
// would otherwise be a strip of one meaningless button.
export default function AiVersions({ record, selected, onSelect }) {
  const versions = versionsOf(record);
  if (versions.length < 2) return null;
  const current = selected ?? versions.length - 1;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {versions.map((version, i) => (
          <button
            key={i}
            type="button"
            title={version.instruction || 'First version'}
            aria-current={i === current}
            onClick={() => onSelect(i)}
            className={i === current ? CURRENT : OTHER}
          >
            v{i + 1}
          </button>
        ))}
      </div>
      {record.dropped && (
        <p className="text-xs text-muted">Showing the last {versions.length}; earlier versions were dropped.</p>
      )}
    </div>
  );
}
