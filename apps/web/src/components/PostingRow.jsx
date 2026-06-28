import { isNewToday, relativeDay } from '../lib/time.js';

const ACTIONS = [
  ['saved', 'Save'],
  ['applied', 'Applied'],
  ['dismissed', 'Dismiss'],
];

// One posting. "New today" rows wear the ember marker; actions fire optimistically.
export default function PostingRow({ posting, onStatus }) {
  const fresh = isNewToday(posting.firstSeenAt);
  const dimmed = posting.status === 'dismissed';

  return (
    <article
      className={`grid grid-cols-[1fr_auto] items-start gap-4 border-b border-line px-6 py-4 ${
        dimmed ? 'opacity-50' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {fresh && (
            <span className="rounded-sm bg-ember px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-paper">
              New
            </span>
          )}
          <a
            href={posting.url}
            target="_blank"
            rel="noreferrer"
            className="truncate font-display text-base font-bold tracking-tight hover:text-ember"
          >
            {posting.title}
          </a>
        </div>
        {(posting.duration || posting.stipend || posting.experience) && (
          <div className="mt-1.5 flex gap-1.5">
            {posting.duration && (
              <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {posting.duration}
              </span>
            )}
            {posting.stipend && (
              <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {posting.stipend}
              </span>
            )}
            {posting.experience && (
              <span className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {posting.experience}
              </span>
            )}
          </div>
        )}
        <p className="mt-1 truncate font-mono text-xs text-muted">
          {posting.company}
          {posting.location ? ` - ${posting.location}` : ''}
          {' - '}
          {posting.source} - {relativeDay(posting.postedAt || posting.firstSeenAt)}
        </p>
        {posting.descriptionSnippet && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink/80">
            {posting.descriptionSnippet}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1.5">
        {ACTIONS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => onStatus(posting.id, posting.status === value ? null : value)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              posting.status === value
                ? 'border-ink bg-ink text-paper'
                : 'border-line text-muted hover:border-ink hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}
