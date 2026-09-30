import { ACTION_KINDS } from '../lib/chatActionKinds.js';
import { providerLabel } from '../lib/chatAnswerer.js';
import ChatBubble from './ChatBubble.jsx';
import ChatAssistant from './ChatAssistant.jsx';
import ChatResultCard from './ChatResultCard.jsx';

// A posting action's answer as a turn of the conversation: what was asked,
// as the person's own bubble (the quick action's words for a run, the
// person's words for a refine), then the answer as a card on the AI's side.
// `data-entry` is what the panel scrolls to when this lands, so the question
// is in view with the card rather than just above the fold.
export default function ChatResultEntry({ entry, card }) {
  const meta = ACTION_KINDS[entry.kind];
  const instruction = entry.record.instruction;

  return (
    <div data-entry={entry.key} className="flex flex-col gap-4">
      <ChatBubble note={instruction ? `Changing: ${meta.name}` : null}>{instruction || meta.label}</ChatBubble>
      <ChatAssistant name={providerLabel(card.providers, entry.record.provider)}>
        <ChatResultCard
          entry={entry}
          providers={card.providers}
          targeted={entry.latest && card.target === entry.kind}
          onTarget={card.onTarget}
          docs={card}
        />
      </ChatAssistant>
    </div>
  );
}
