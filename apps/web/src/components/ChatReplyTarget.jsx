import { CloseIcon, PenIcon } from './Icon.jsx';

// Says, right where the next message is typed, that it will change a card
// rather than ask a question. Saffron like the ring on the card it names.
// Clearing it goes back to plain chat.
export default function ChatReplyTarget({ name, onClear }) {
  return (
    <div className="flex">
      <p className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-0.5 pl-2.5 pr-0.5 text-xs font-semibold text-primary">
        <PenIcon size={12} />
        <span className="truncate">Changing: {name}</span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Stop changing it, back to plain chat"
          title="Back to plain chat"
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors duration-fast ease hover:bg-primary/15"
        >
          <CloseIcon size={11} />
        </button>
      </p>
    </div>
  );
}
