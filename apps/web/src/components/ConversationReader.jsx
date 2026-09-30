import { useConversationReader } from '../lib/useConversationReader.js';
import { shortStamp } from '../lib/time.js';
import ChatTurn from './ChatTurn.jsx';
import ConversationReaderFooter from './ConversationReaderFooter.jsx';
import { ChevronRightIcon } from './Icon.jsx';

// A filed conversation, whole and read-only: nothing can be asked in it
// from here, but the changes it offered can still be applied, since filing
// a conversation away is not turning its offers down (the server checks
// each against the profile or document as it is now, see its
// chat-proposals.js). "Continue this conversation" makes it the current
// one, filing the current one in its place.
export default function ConversationReader({ id, providers, links, onBack, onDeleted }) {
  const reader = useConversationReader(id, { onContinued: links.onContinued, onDeleted });
  const { conversation } = reader;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded-full py-0.5 pr-2 text-xs font-semibold text-muted transition-colors duration-fast ease hover:text-ink">
          <ChevronRightIcon size={12} className="rotate-180" />
          All conversations
        </button>
        {conversation && (
          <>
            <h3 className="mt-1 truncate font-display text-md font-bold text-ink" title={conversation.title}>{conversation.title}</h3>
            <p className="text-xs text-muted">Started {shortStamp(conversation.startedAt)}. Last answer {shortStamp(conversation.endedAt)}.</p>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-5">
          {conversation === undefined && <p className="text-sm text-muted">Opening the conversation...</p>}
          {conversation === null && <p className="text-sm text-muted">That conversation is not there any more.</p>}
          {conversation?.turns.map((turn, i) => (
            <ChatTurn key={turn.id ?? i} turn={turn} providers={providers} onApply={links.onApply} onOpenRef={links.onOpenRef} />
          ))}
        </div>
      </div>
      {conversation && (
        <div className="shrink-0 border-t border-line px-3 py-3">
          <ConversationReaderFooter busy={reader.busy} onContinue={reader.carryOn} onDelete={reader.remove} />
        </div>
      )}
    </div>
  );
}
