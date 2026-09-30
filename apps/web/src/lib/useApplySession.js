import { useCallback, useEffect, useRef, useState } from 'react';
import { openApply, currentApply, closeApply, applySocketUrl } from '../api/apply.js';
import { connectApply } from './applySocket.js';

// One Apply session as the panel sees it: opened for this posting (or picked
// back up, when it is already open), its view kept current over the socket,
// and each new picture handed to whatever draws it. A session for another
// posting is reported as a conflict for the person to settle; nothing is
// closed on their behalf.
//
//   status: 'opening' | 'open' | 'conflict' | 'failed' | 'closed'
export function useApplySession(posting, { connect = connectApply } = {}) {
  const [state, setState] = useState({ status: 'opening', view: null, error: null, other: null });
  const link = useRef(null);
  const draw = useRef(null);
  const frame = useRef(null);
  const idRef = useRef(null);
  // Only the latest open's answer is acted on. React rehearses every mount in
  // development, so the first mount's open is answered to nobody, and the
  // second, told the session is already open, picks the same one back up:
  // one browser and one socket, never two.
  const turn = useRef(0);
  // Set once the person closes the panel; a session still opening then is
  // closed the moment it arrives, rather than left running until it idles out.
  const quit = useRef(false);

  const attach = useCallback((view, token) => {
    idRef.current = view.id;
    setState({ status: 'open', view, error: null, other: null });
    link.current?.close();
    link.current = connect({
      url: applySocketUrl(view.id),
      token,
      onView: (next) => setState((s) => ({ ...s, view: next })),
      onFrame: (meta, blob) => {
        frame.current = meta;
        draw.current?.(meta, blob);
      },
      onClosed: () => setState((s) => ({ ...s, status: 'closed' })),
    });
  }, [connect]);

  const start = useCallback(async () => {
    const mine = (turn.current += 1);
    const latest = () => turn.current === mine && !quit.current;
    setState({ status: 'opening', view: null, error: null, other: null });
    try {
      const { session, token } = await openApply(posting.id);
      if (quit.current) return closeApply(session.id).catch(() => {});
      if (latest()) attach(session, token);
    } catch (err) {
      if (!latest()) return undefined;
      if (err.status !== 409) return setState((s) => ({ ...s, status: 'failed', error: err.message }));
      const open = await currentApply().catch(() => ({ session: null }));
      if (!latest()) return undefined;
      if (open.session?.postingId === posting.id) return attach(open.session, open.token);
      setState((s) => ({ ...s, status: 'conflict', error: err.message, other: open.session }));
    }
    return undefined;
  }, [posting.id, attach]);

  useEffect(() => {
    start();
    return () => {
      turn.current += 1;
      link.current?.close();
      link.current = null;
    };
  }, [start]);

  // Stable, so the live view subscribes once rather than on every picture.
  const setDraw = useCallback((fn) => { draw.current = fn; }, []);
  const send = useCallback((msg) => link.current?.send(msg), []);

  return {
    ...state,
    frame,
    sessionId: () => idRef.current,
    setDraw,
    send,
    async close() {
      quit.current = true;
      link.current?.close();
      if (idRef.current) await closeApply(idRef.current).catch(() => {});
    },
    // "Close that one and open this": the person's own choice, from the conflict.
    async replace() {
      if (state.other) await closeApply(state.other.id).catch(() => {});
      await start();
    },
  };
}
