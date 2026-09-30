import { useEffect, useRef } from 'react';
import ChatTurn from './ChatTurn.jsx';
import ChatResultEntry from './ChatResultEntry.jsx';
import ChatEmptyState from './ChatEmptyState.jsx';
import ChatPending from './ChatPending.jsx';

// The scrolling middle of the panel, and the only part of it that scrolls:
// the header above and the box below stay put. Every question and every
// action answer so far, oldest on top like a transcript (see
// lib/conversation.js), then the call in flight.
//
// Where it scrolls to: the newest entry as it arrives, except that a card is
// read from its top, so the newest card is brought to its top instead; and a
// chat opening on a job lands on that job's newest card, which is how an
// answer paid for days ago is seen rather than buried above today's turns.
export default function ChatMessages({ entries, call, empty, card, onApply, onOpenRef }) {
  const listRef = useRef(null);
  const endRef = useRef(null);
  const lastKey = entries.at(-1)?.key;
  const lastCard = entries.findLast((entry) => entry.type === 'result')?.key;

  // jsdom (the test environment) has no scrollIntoView at all, unlike a real
  // browser, so these are optional calls rather than only optional reads.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [lastKey, Boolean(call)]);

  useEffect(() => {
    if (!lastCard) return;
    listRef.current?.querySelector(`[data-entry="${lastCard}"]`)?.scrollIntoView?.({ block: 'start' });
  }, [lastCard]);

  return (
    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-4 py-5">
        {!entries.length && !call && <ChatEmptyState {...empty} />}
        {entries.map((entry) => (entry.type === 'turn'
          ? <ChatTurn key={entry.key} turn={entry.turn} providers={card.providers} onApply={onApply} onOpenRef={onOpenRef} />
          : <ChatResultEntry key={entry.key} entry={entry} card={card} />))}
        {call && <ChatPending call={call} providers={card.providers} />}
        <div ref={endRef} />
      </div>
    </div>
  );
}
