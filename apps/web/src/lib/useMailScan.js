import { useCallback, useEffect, useRef, useState } from 'react';
import { getMailScan, startMailScan, undoMailScan } from '../api.js';
import { trackerChanged } from './trackerSignal.js';

// The mail scan's status for whatever shows it (Settings' Gmail card, the
// Tracker's line), read again every second and a half while a scan runs and
// every minute otherwise, so a check the server starts on its own shows up.
// Starting a scan switches to the quick reads at once. When a scan ends, or
// is undone, the Tracker reads its entries again.
const RUNNING_MS = 1500;
const IDLE_MS = 60000;

export function useMailScan() {
  const [status, setStatus] = useState(undefined);
  const [error, setError] = useState(null);
  const running = useRef(false);
  const timer = useRef(null);
  const live = useRef(true);
  const read = useRef(null);

  const take = useCallback((next) => {
    if (running.current && !next?.running) trackerChanged();
    running.current = Boolean(next?.running);
    setStatus(next);
    clearTimeout(timer.current);
    if (live.current) timer.current = setTimeout(() => read.current(), running.current ? RUNNING_MS : IDLE_MS);
  }, []);

  useEffect(() => {
    live.current = true;
    read.current = async () => {
      try {
        const next = await getMailScan();
        if (live.current) take(next);
      } catch {
        if (!live.current) return;
        setStatus((now) => now ?? null);
        timer.current = setTimeout(() => read.current(), IDLE_MS);
      }
    };
    read.current();
    return () => {
      live.current = false;
      clearTimeout(timer.current);
    };
  }, [take]);

  const act = (call) => async (...args) => {
    setError(null);
    try {
      return await call(...args);
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  return {
    status,
    error,
    scan: act(async (options) => take(await startMailScan(options))),
    undo: act(async () => {
      const outcome = await undoMailScan();
      take(outcome.status);
      trackerChanged();
      return outcome;
    }),
  };
}
