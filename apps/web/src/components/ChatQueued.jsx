import { CloseIcon } from './Icon.jsx';

// A question written while an answer was on its way, held above the box
// until that answer is in (see ChatInput.jsx), with a way to take it back.
export default function ChatQueued({ text, onRemove }) {
  return (
    <p className="flex items-center gap-2 rounded-xl border border-line bg-select/60 px-3 py-1.5 text-xs text-muted">
      <span className="min-w-0 flex-1 truncate">
        Sends once this answer is in: <span className="text-ink">{text}</span>
      </span>
      <button type="button" onClick={onRemove} aria-label="Do not send it" title="Do not send it" className="btn btn-ghost btn-icon h-6 w-6 shrink-0">
        <CloseIcon size={11} />
      </button>
    </p>
  );
}
