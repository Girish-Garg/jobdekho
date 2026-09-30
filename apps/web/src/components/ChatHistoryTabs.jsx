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
      <button
        type="button"
        onClick={onBack}
        className="ml-auto rounded-full px-2.5 py-1 text-xs font-semibold text-muted transition-colors duration-fast ease hover:bg-ink/5 hover:text-ink"
      >
        Back to the chat
      </button>
    </div>
  );
}
