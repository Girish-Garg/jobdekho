import { useEffect, useRef, useState } from 'react';
import { getScrapeState, startScrape } from '../api.js';
import { notifyError } from './toast.js';
import { announceRefreshed } from './postingsRefreshedSignal.js';

// Asked every 1.5 s while a refresh runs. Otherwise once a minute, so a
// refresh the server started on its own (see its scrape/auto.js) shows here
// too, and the feed still reads its page again when that one ends.
export const RUNNING_POLL_MS = 1500;
export const IDLE_POLL_MS = 60 * 1000;

// Refreshing postings from the app: the server's state (see api/scrape.js),
// `finished` once a run this page watched has ended, and start(). The run
// belongs to the server, so a page loaded mid-run finds it and follows it
// like one it started, and leaving the page does not stop it. When a watched
// run ends the feed is told to read its page again (postingsRefreshedSignal).
export function useScrape({ runningMs = RUNNING_POLL_MS, idleMs = IDLE_POLL_MS } = {}) {
  const [scrape, setScrape] = useState(null);
  const [finished, setFinished] = useState(false);
  const watching = useRef(false);
  const readNow = useRef(() => {});

  // Only setters and refs, so the copy the poll loop holds never goes stale.
  function take(next) {
    setScrape(next);
    if (next.running) {
      watching.current = true;
      setFinished(false);
      return;
    }
    if (!watching.current) return;
    watching.current = false;
    setFinished(true);
    announceRefreshed(next.result ?? null);
  }

  useEffect(() => {
    let alive = true;
    let timer = null;
    let turn = 0;
    // Each read replaces any still waiting, so the start button's read and
    // the timer's never run two chains of polls side by side. A failed read
    // is asked again at the pace of what was last seen.
    async function read() {
      clearTimeout(timer);
      const mine = (turn += 1);
      const next = await getScrapeState().catch(() => null);
      if (!alive || mine !== turn) return;
      if (next) take(next);
      const busy = next ? next.running : watching.current;
      timer = setTimeout(read, busy ? runningMs : idleMs);
    }
    readNow.current = read;
    read();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [runningMs, idleMs]); // eslint-disable-line react-hooks/exhaustive-deps

  // A 409 means a run is already going, which is what was asked for: it is
  // followed like any other rather than reported as a failure.
  async function start() {
    try {
      take(await startScrape());
    } catch (err) {
      if (err?.status !== 409) notifyError(err, 'Could not refresh postings');
    }
    readNow.current();
  }

  return { scrape, finished, start };
}
