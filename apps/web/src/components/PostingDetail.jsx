import { levelLabel, degreeLabel, workModeLabel } from '../lib/taxonomy.js';
import { levelTone } from '../lib/levelColor.js';
import { relativeDay } from '../lib/time.js';
import PostingActions from './PostingActions.jsx';

// Only one overlay is ever mounted, so a constant id is enough to name it.
export const TITLE_ID = 'posting-dialog-title';

// Third slot is the value's own colour, so the level keeps the hue it had on
// the card. Rows the scraper never filled drop out rather than read "unknown".
function detailRows(posting) {
  const others = (posting.groupCount || 1) - 1;
  return [
    ['Location', posting.location],
    ['Also listed in', others > 0 ? `${others} other location${others === 1 ? '' : 's'}` : ''],
    ['Work mode', workModeLabel(posting.workMode)],
    ['Level', levelLabel(posting.level), levelTone(posting.level).text],
    ['Degree', degreeLabel(posting.degreeMin, posting.degreeRequired)],
    ['Stipend', posting.stipend],
    ['Duration', posting.duration],
    ['Experience', posting.experience],
    ['Posted', relativeDay(posting.postedAt || posting.firstSeenAt)],
    ['Last seen', relativeDay(posting.lastSeenAt)],
    ['Source', posting.source],
  ].filter(([, value]) => value);
}

export default function PostingDetail({ posting, onClose, onStatus }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 id={TITLE_ID} className="font-display text-2xl font-extrabold leading-tight tracking-tight">
            {posting.title}
          </h2>
          <p className="mt-1 text-sm text-muted">{posting.company}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-ink hover:text-ink"
        >
          &#215;
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 sm:grid-cols-3">
        {detailRows(posting).map(([label, value, tone]) => (
          <div key={label} className="min-w-0">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</dt>
            <dd className={`mt-0.5 truncate text-sm ${tone || 'text-ink'}`}>{value}</dd>
          </div>
        ))}
      </dl>

      {posting.descriptionSnippet && (
        <p className="text-sm leading-relaxed text-ink/80">{posting.descriptionSnippet}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <PostingActions
          status={posting.status}
          onStatus={(value) => onStatus(posting.id, posting.status === value ? null : value)}
        />
        <a
          href={posting.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-ink px-4 py-2 font-mono text-[11px] text-paper transition hover:opacity-85"
        >
          Open posting
        </a>
      </div>
    </div>
  );
}
