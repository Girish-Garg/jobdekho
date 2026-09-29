import { useEffect, useRef } from 'react';
import ChatTurn from './ChatTurn.jsx';
import ChatResultEntry from './ChatResultEntry.jsx';

const EMPTY = {
  scoped: 'Ask anything about this job, or start with one of the actions below.',
  feed: 'Ask about the postings on screen, or open one to ask about it.',
};

// The scrolling middle of the panel: every question and every action answer
// so far, oldest on top like a transcript (see lib/conversation.js), then
// the call in flight with its progress line.
//
// Where it scrolls to: the newest entry as it arrives, except that a card is
// read from its top, so the newest card is brought to its top instead; and a
// chat opening on a job lands on that job's newest card, which is how an
// answer paid for days ago is seen rather than buried above today's turns.
export default function ChatMessages({ entries, pending, progress, scoped, loading, card, onApply, onOpenRef }) {
  const listRef = useRef(null);
  const endRef = useRef(null);
  const lastKey = entries.at(-1)?.key;
  const lastCard = entries.findLast((entry) => entry.type === 'result')?.key;

  // jsdom (the test environment) has no scrollIntoView at all, unlike a real
  // browser, so these are optional calls rather than only optional reads.
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [lastKey, Boolean(pending)]);

  useEffect(() => {
    if (!lastCard) return;
    listRef.current?.querySelector(`[data-entry="${lastCard}"]`)?.scrollIntoView?.({ block: 'start' });
  }, [lastCard]);

  return (
    <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4">
      {!entries.length && !pending && (
        <p className="py-4 text-sm text-muted">{loading ? 'Looking for earlier answers about this job...' : EMPTY[scoped ? 'scoped' : 'feed']}</p>
      )}
      <div className="flex flex-col divide-y divide-line">
        {entries.map((entry) => (entry.type === 'turn'
          ? <ChatTurn key={entry.key} turn={entry.turn} onApply={onApply} onOpenRef={onOpenRef} />
          : <ChatResultEntry key={entry.key} entry={entry} card={card} />))}
        {pending && (
          <div className="flex flex-col gap-1 py-3">
            {pending.changing && <p className="text-xs text-muted">Changing: {pending.changing}</p>}
            <p className="text-sm font-semibold text-ink">{pending.say}</p>
            <p aria-live="polite" className="text-sm text-muted">{progress}</p>
          </div>
        )}
      </div>
      <div ref={endRef} />
    </div>
  );
}
