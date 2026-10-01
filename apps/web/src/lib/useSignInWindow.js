import { useCallback, useEffect, useRef, useState } from 'react';
import { openSignInWindow, signInWindowState, closeSignInWindow } from '../api/apply.js';

const POLL_MS = 1500;

// The normal window to sign in from (see the server's apply/sign-in-window.js),
// as the panel sees it: start() ends the application's browser and opens the
// window; while it is open the panel waits (`waiting`, with the address it
// opened at), and once the person closes it, or presses Continue, Apply
// assist opens again on the same posting, signed in.
export function useSignInWindow(apply) {
  const [waiting, setWaiting] = useState(null);
  const latest = useRef(apply);
  latest.current = apply;

  const resume = useCallback(async () => {
    setWaiting(null);
    await closeSignInWindow().catch(() => {});
    await latest.current.replace();
  }, []);

  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setInterval(async () => {
      const { open } = await signInWindowState().catch(() => ({ open: true }));
      if (!open) resume();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, resume]);

  const start = useCallback(async () => {
    const id = latest.current.sessionId();
    if (!id) return;
    const { url } = await openSignInWindow(id);
    setWaiting({ url });
  }, []);

  return { waiting, start, resume };
}
