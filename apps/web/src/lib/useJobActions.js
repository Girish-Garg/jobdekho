import { useEffect, useState } from 'react';
import { providerFor } from './providerFor.js';
import { ACTION_KINDS } from './chatActionKinds.js';
import { runJobAction } from './chatAsk.js';

// The posting actions as the chat on screen presses them: its own job's in
// a job's chat, any of its jobs' from a comparison or a document's chat
// (which then keeps a note of where the action ran, see chatAsk.js).
//
// `blocked` is the kind just asked for that no installed CLI can take (a
// web check with only a CLI that cannot search): the panel shows the
// install hint for it rather than a call that could only fail. It belongs
// to the chat it was asked in, so another chat never shows it.
export function useJobActions({ chatId, providers }) {
  const [blocked, setBlocked] = useState(null);

  useEffect(() => setBlocked(null), [chatId]);

  function start(postingId, kind, { instruction = '', askedIn = null } = {}) {
    const meta = ACTION_KINDS[kind];
    if (!meta || !postingId) return null;
    if (Array.isArray(providers) && !providerFor(providers, meta.policy)) {
      setBlocked(kind);
      return null;
    }
    setBlocked(null);
    return runJobAction(postingId, kind, { instruction, askedIn });
  }

  return { blocked, clearBlocked: () => setBlocked(null), start };
}
