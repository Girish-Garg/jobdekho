import { CloseIcon } from './Icon.jsx';

// Says, right where the next message is typed, that it will change a card
// rather than ask a question. Clearing it goes back to plain chat.
export default function ChatReplyTarget({ name, onClear }) {
  return (
    <div className="px-3 pt-3">
      <p className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-ink bg-select py-0.5 pl-2 pr-1 text-xs text-ink">
        <span className="truncate">Changing: {name}</span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Stop changing it, back to plain chat"
          className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted transition-colors duration-fast ease hover:text-ink"
        >
          <CloseIcon size={12} />
        </button>
      </p>
    </div>
  );
}
