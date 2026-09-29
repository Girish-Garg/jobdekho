import { CloseIcon } from './Icon.jsx';

// The job the conversation is about, named where the conversation starts, so
// "is this real?" or "write me a letter" is never ambiguous about which one.
// Clearing it turns the chat back into questions about the feed as a whole.
export default function ChatScopeCard({ posting, onClear }) {
  return (
    <div className="flex items-start gap-3 border-b border-line bg-paper px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">Asking about</p>
        <p className="truncate text-sm font-semibold text-ink" title={posting.title}>{posting.title}</p>
        <p className="truncate text-xs text-muted">{posting.company}</p>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Stop asking about this job"
        title="Stop asking about this job"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition-colors duration-fast ease hover:text-ink"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
