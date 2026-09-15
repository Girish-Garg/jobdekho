import { useCallback, useEffect, useRef, useState } from 'react';

// Long enough to read and click, short enough that it cannot outlive the
// row it belongs to once you have scrolled on.
const FLASH_MS = 6000;

// Wraps the feed's optimistic onStatus with the two things a row-level
// triage flow needs that the feed itself has no opinion on: a single-step
// undo back to whatever the status was before, and a brief "Dismissed.
// Undo" flash that clears itself. Reads `rows` for the previous value
// rather than tracking its own copy, so it can never disagree with what
// the feed actually holds.
export function useTriage(rows, onStatus) {
  const [lastChange, setLastChange] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const setStatus = useCallback(
    (id, value) => {
      const previous = rows.find((row) => row.id === id)?.status ?? null;
      // A toggle, matching the overlay's own buttons: pressing the active
      // status again clears it rather than reapplying the same value.
      const next = previous === value ? null : value;
      setLastChange({ id, previous });
      onStatus(id, next);
      clearTimeout(timerRef.current);
      if (next === 'dismissed') {
        setFlashId(id);
        timerRef.current = setTimeout(() => setFlashId(null), FLASH_MS);
      } else {
        setFlashId((current) => (current === id ? null : current));
      }
    },
    [rows, onStatus],
  );

  const undo = useCallback(() => {
    if (!lastChange) return;
    onStatus(lastChange.id, lastChange.previous);
    setFlashId((current) => (current === lastChange.id ? null : current));
    setLastChange(null);
    clearTimeout(timerRef.current);
  }, [lastChange, onStatus]);

  return { setStatus, undo, flashId, canUndo: Boolean(lastChange) };
}
