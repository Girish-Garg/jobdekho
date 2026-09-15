import { useEffect } from 'react';

const STATUS_KEY = { s: 'saved', a: 'applied', d: 'dismissed' };

// A row is never a text field, so this only has to rule out the controls
// that legitimately want their own letters: search boxes, the sort select.
function isTypingTarget(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target?.isContentEditable);
}

// One listener for the whole feed, so j/k works from anywhere on the page
// without every row needing its own key handler or DOM focus. Selection
// moves by id, not by index, so it survives the list re-sorting under it -
// and stays put rather than jumping to row 0 when the id it was on is gone.
export function useListKeys({ rows, selectedId, onSelect, onOpen, onStatus, onUndo, onClear, enabled = true }) {
  useEffect(() => {
    if (!enabled) return undefined;

    function move(delta) {
      if (rows.length === 0) return;
      const index = rows.findIndex((row) => row.id === selectedId);
      const next = index === -1 ? 0 : Math.min(Math.max(index + delta, 0), rows.length - 1);
      onSelect(rows[next].id);
    }

    function handleKeyDown(event) {
      // A modifier turns these into browser or OS shortcuts (ctrl+a select
      // all, cmd+k the chrome agent's own binding); this list only owns the
      // bare key.
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case 'j':
        case 'ArrowDown':
          event.preventDefault();
          move(1);
          return;
        case 'k':
        case 'ArrowUp':
          event.preventDefault();
          move(-1);
          return;
        case 'Enter':
          if (selectedId) onOpen(selectedId);
          return;
        case 'Escape':
          onClear();
          return;
        case 'u':
          onUndo();
          return;
        default: {
          const value = STATUS_KEY[event.key];
          if (value && selectedId) onStatus(selectedId, value);
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [rows, selectedId, onSelect, onOpen, onStatus, onUndo, onClear, enabled]);
}
