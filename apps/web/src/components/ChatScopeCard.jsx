import ChatMonogram from './ChatMonogram.jsx';
import { CloseIcon } from './Icon.jsx';

// The job the conversation is about, named where the conversation starts, so
// "is this real?" or "write me a letter" is never ambiguous about which one.
// Clearing it turns the chat back into questions about the feed as a whole.
export default function ChatScopeCard({ posting, onClear }) {
  return (
    <div className="shrink-0 border-b border-line px-3 py-2.5">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-paper py-2 pl-2 pr-1.5">
        <ChatMonogram name={posting.company} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Asking about</p>
          <p className="truncate text-sm font-semibold text-ink" title={posting.title}>{posting.title}</p>
          <p className="truncate text-xs text-muted">{posting.company}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Stop asking about this job"
          title="Stop asking about this job"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-fast ease hover:bg-ink/5 hover:text-ink"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
