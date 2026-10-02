import Button from './ui/Button.jsx';

// History's two lists as one control with two sides, like the Resume
// page's Preview and Source toggle, with the way back to the chat beside
// them for a person who does not think to press History again.
export const TABS = [
  ['conversations', 'Conversations'],
  ['made', 'Made by AI'],
];

export default function ChatHistoryTabs({ tab, onTab, onBack }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2.5">
      <div role="tablist" aria-label="History" className="flex items-center rounded-full border border-line bg-paper p-0.5">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`chat-history-tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`chat-history-panel-${value}`}
            onClick={() => onTab(value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-fast ease ${
              tab === value ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {/* The panel can be as narrow as 320px, so the way back wraps there
          rather than pushing the row past the panel's edge. */}
      <Button variant="ghost" size="sm" onClick={onBack} className="ml-auto whitespace-normal">
        Back to the chat
      </Button>
    </div>
  );
}
