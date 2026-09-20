import { useEffect, useRef } from 'react';
import ChatTurn from './ChatTurn.jsx';

// The scrolling middle of the panel: empty-state copy until the first
// question, then every turn asked so far, oldest on top like a transcript,
// scrolled to the newest as it arrives.
export default function ChatMessages({ turns, onApply }) {
  const endRef = useRef(null);

  useEffect(() => {
    // jsdom (the test environment) has no scrollIntoView at all, unlike a
    // real browser, so this is an optional call rather than only an optional
    // read.
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [turns.length]);

  if (!turns.length) {
    return <p className="flex-1 p-4 text-sm text-muted">Ask about the postings on screen, or the one you have open.</p>;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4">
      <div className="flex flex-col divide-y divide-line">
        {turns.map((turn, i) => <ChatTurn key={turn.createdAt ?? i} turn={turn} onApply={onApply} />)}
      </div>
      <div ref={endRef} />
    </div>
  );
}
