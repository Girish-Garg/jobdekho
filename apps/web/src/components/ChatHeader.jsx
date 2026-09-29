import { CloseIcon } from './Icon.jsx';

// The panel's title row: what it is, a fresh start, and the way out.
export default function ChatHeader({ onNew, onClose }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
      <p className="text-sm font-semibold">Ask AI</p>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onNew} className="text-xs text-muted transition-colors duration-fast ease hover:text-ink">
          New
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the chat"
          className="grid h-6 w-6 place-items-center rounded-md text-muted transition-colors duration-fast ease hover:text-ink"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
