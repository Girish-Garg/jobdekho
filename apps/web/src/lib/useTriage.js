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
  // The dismissal whose "Undo" shows: which posting, and what it was before.
  const [flash, setFlash] = useState(null);
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
      // Only a new dismissal, or a change to the posting that is flashing,
      // touches the flash. A save on another posting meanwhile used to stop
      // the clock and leave that Undo up for good.
      if (next === 'dismissed') {
        clearTimeout(timerRef.current);
        setFlash({ id, previous });
        timerRef.current = setTimeout(() => setFlash(null), FLASH_MS);
      } else {
        setFlash((current) => (current?.id === id ? null : current));
      }
    },
    [rows, onStatus],
  );

  // A posting's own Undo puts back the dismissal it shows (`id`); with no
  // id, as from the keyboard, the last change is undone, whichever posting
  // it was. The flash's Undo used to undo the last change too, so after a
  // save elsewhere it took back the save and left the dismissal.
  const undo = useCallback((id) => {
    const change = id != null && flash?.id === id ? flash : lastChange;
    if (!change) return;
    onStatus(change.id, change.previous);
    if (flash?.id === change.id) {
      clearTimeout(timerRef.current);
      setFlash(null);
    }
    if (lastChange?.id === change.id) setLastChange(null);
  }, [flash, lastChange, onStatus]);

  return { setStatus, undo, flashId: flash?.id ?? null, canUndo: Boolean(lastChange) };
}
