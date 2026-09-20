import { useEffect, useState } from 'react';
import { useProviders } from '../lib/useProviders.js';
import { useChat } from '../lib/useChat.js';
import { onOpenPostingChange, currentOpenPostingId } from '../lib/openPostingSignal.js';
import AiError from './AiError.jsx';
import ChatMessages from './ChatMessages.jsx';
import ChatInput from './ChatInput.jsx';

// The actual panel, split out of AiChatPanel.jsx so its hooks - loading the
// conversation, probing for a CLI - only ever run while the panel is open.
// AiChatPanel renders this only when `open`, rather than mounting it always
// and hiding it, so closing the panel truly stops asking for anything.
export default function ChatPanelBody({ onClose, context, apply }) {
  const { providers, checking, refresh } = useProviders();
  const { turns, busy, progress, error, send, startNew, clearError } = useChat(providers);
  const [openPostingId, setOpenPostingId] = useState(currentOpenPostingId);

  useEffect(() => onOpenPostingChange(setOpenPostingId), []);

  function onApply(action) {
    if (action.type === 'filters') apply.setFilters({ ...context.filters, ...action.patch });
    else if (action.type === 'sort') apply.setSort(action.value);
  }

  function onSend(message) {
    send(message, { filters: context.filters, sort: context.sort, openPostingId });
  }

  return (
    <aside aria-label="Ask about your feed" className="flex w-[22rem] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
        <p className="text-sm font-semibold">Ask</p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={startNew} className="text-xs text-muted transition-colors duration-fast ease hover:text-ink">
            New
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the chat"
            className="text-muted transition-colors duration-fast ease hover:text-ink"
          >
            &#215;
          </button>
        </div>
      </div>
      <ChatMessages turns={turns} onApply={onApply} />
      <div aria-live="polite" className="min-h-[1.25rem] px-4 text-xs text-muted">{busy ? progress : ''}</div>
      {error && (
        <div className="px-4 pb-2">
          <AiError error={error} checking={checking} onRecheck={() => { clearError(); refresh(); }} />
        </div>
      )}
      <ChatInput busy={busy} onSend={onSend} />
    </aside>
  );
}
