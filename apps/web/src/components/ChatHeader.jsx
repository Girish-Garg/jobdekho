import ChatAvatar from './ChatAvatar.jsx';
import { CloseIcon, HistoryIcon, PinIcon, PinOffIcon, PlusIcon } from './Icon.jsx';

// Which CLI will answer, said before anything is asked: the person pays for
// it on their own subscription, so it is named rather than left as "AI".
// The dot is its state: found, still looking, or nothing that can answer.
function status(providers, answerer) {
  // "on this PC" rather than "on this computer": the panel's header is narrow,
  // and the longer words were cut off after the CLI's name.
  if (answerer) return { text: `${answerer.label} on this PC`, dot: 'bg-applied' };
  if (!Array.isArray(providers)) return { text: 'Looking for an AI CLI on this computer...', dot: 'bg-muted breathe' };
  return { text: 'No AI CLI found on this computer', dot: 'bg-ember' };
}

function HeaderButton({ label, active = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors duration-fast ease ${
        active ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'text-muted hover:bg-ink/5 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

// The panel's title row: what it is and who answers, its history (past
// conversations and what the AI made, see ChatHistory.jsx), a fresh start,
// where it sits (only on a window wide enough to have a choice, and not on
// a page that docks it, see useChatLayout.js), and the way out.
export default function ChatHeader({ providers, answerer, layout, history = false, onHistory, onNew, onClose }) {
  const now = status(providers, answerer);
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 py-3">
      <ChatAvatar size="md" />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-md font-bold leading-tight text-ink">Ask AI</h2>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${now.dot}`} />
          <span className="truncate">{now.text}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {onHistory && (
          <HeaderButton label={history ? 'Close history' : 'History'} active={history} onClick={onHistory}><HistoryIcon size={16} /></HeaderButton>
        )}
        <HeaderButton label="New chat" onClick={onNew}><PlusIcon size={16} /></HeaderButton>
        {layout.wide && !layout.docked && (
          <HeaderButton label={layout.pinned ? 'Float over the page' : 'Pin to the side'} active={layout.pinned} onClick={layout.togglePinned}>
            {layout.pinned ? <PinOffIcon size={16} /> : <PinIcon size={16} />}
          </HeaderButton>
        )}
        <HeaderButton label="Close the chat" onClick={onClose}><CloseIcon size={16} /></HeaderButton>
      </div>
    </div>
  );
}
