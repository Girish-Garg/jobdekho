import { useState } from 'react';

// Mirrors lib/theme.js: a storage key, a read that never throws, a write
// that is allowed to fail silently since a forgotten choice just re-defaults
// to rows next time.
export const KEY = 'jobdekho-view-mode';
export const MODES = ['list', 'grid'];

export function readViewMode(storage = globalThis.localStorage) {
  try {
    const stored = storage?.getItem(KEY);
    return MODES.includes(stored) ? stored : 'list';
  } catch {
    return 'list';
  }
}

export function writeViewMode(mode, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, mode);
  } catch {
    // A choice that does not persist is still a choice for this session.
  }
}

// Rows are the default so this only ever has to remember the one time
// someone opts into cards.
export function useViewMode() {
  const [mode, setMode] = useState(() => readViewMode());
  function pick(next) {
    writeViewMode(next);
    setMode(next);
  }
  return [mode, pick];
}
