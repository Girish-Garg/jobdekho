import { ArrowRightIcon } from './Icon.jsx';

// The postings an answer named, as the server checked them (see
// apps/server/src/chat/refs.js): only ids the question's own feed carried,
// worded from the store rather than by the model. A click opens that posting
// in the pane, the one thing an answer could not do before.
export default function ChatRefs({ refs, onOpen }) {
  return (
    <ul aria-label="Jobs in this answer" className="flex flex-col divide-y divide-line rounded-md border border-line bg-paper">
      {refs.map((ref) => (
        <li key={ref.id}>
          <button
            type="button"
            onClick={() => onOpen(ref.id)}
            className="group flex w-full items-center gap-3 px-2.5 py-1.5 text-left transition-colors duration-fast ease hover:bg-select"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{ref.title}</span>
              <span className="block truncate text-xs text-muted">{ref.company}</span>
            </span>
            {ref.fit !== null && ref.fit !== undefined && (
              <span className="shrink-0 font-mono text-xs text-muted">fit {ref.fit}</span>
            )}
            <ArrowRightIcon className="text-muted transition-colors duration-fast ease group-hover:text-ink" />
          </button>
        </li>
      ))}
    </ul>
  );
}
