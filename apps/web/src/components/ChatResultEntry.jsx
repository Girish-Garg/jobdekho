import { ACTION_KINDS } from '../lib/chatActionKinds.js';
import ChatResultCard from './ChatResultCard.jsx';

// A posting action's answer as a turn of the conversation: what was asked,
// in the same weight a typed question gets (the quick action's own words for
// a run, the person's words for a refine), then the answer as a card.
// `data-entry` is what the panel scrolls to when this lands, so the question
// is in view with the card rather than just above the fold.
export default function ChatResultEntry({ entry, card }) {
  const meta = ACTION_KINDS[entry.kind];
  const instruction = entry.record.instruction;

  return (
    <div data-entry={entry.key} className="flex flex-col gap-2 py-3">
      {instruction && <p className="text-xs text-muted">Changing: {meta.name}</p>}
      <p className="text-sm font-semibold text-ink">{instruction || meta.label}</p>
      <ChatResultCard
        entry={entry}
        providers={card.providers}
        targeted={entry.latest && card.target === entry.kind}
        onTarget={card.onTarget}
        onOpenBuilder={card.onOpenBuilder}
      />
    </div>
  );
}
