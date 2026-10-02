import { useCallback, useEffect, useState } from 'react';
import { getMemory, saveMemory, editMemory, deleteMemory, forgetMemory, setMemoryEnabled } from '../api.js';
import { onMemoryChanged } from './memorySignal.js';

// The Profile page's "What the AI knows about you" (see MemorySection.jsx).
// The list is the server's: read when the section opens, again after every
// change made here, and whenever a chat chip changes it (see
// memorySignal.js), so the page never shows a list the server does not hold.
//
//   state   'loading', 'ready' or 'failed' (the first read did not come back)
//   error   the server's own sentence for the last change it refused
export function useMemory() {
  const [memory, setMemory] = useState({ state: 'loading', enabled: true, items: [], archived: 0 });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // A later read that fails keeps the list already shown rather than
  // blanking it; the change that came before it says whether it went through.
  const load = useCallback(async () => {
    try {
      const next = await getMemory();
      setMemory({ state: 'ready', enabled: next.enabled !== false, items: next.items ?? [], archived: next.archived ?? 0 });
    } catch {
      setMemory((current) => (current.state === 'ready' ? current : { ...current, state: 'failed' }));
    }
  }, []);

  useEffect(() => {
    load();
    return onMemoryChanged(load);
  }, [load]);

  // Resolves true once the server took the change, so a form can close only
  // then; a refusal leaves everything as it was, with the reason.
  async function change(work) {
    setBusy(true);
    setError(null);
    try {
      await work();
      await load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    ...memory,
    error,
    busy,
    retry: load,
    add: (text, scope) => change(() => saveMemory({ text, scope })),
    edit: (id, edits) => change(() => editMemory(id, edits)),
    remove: (id) => change(() => deleteMemory(id)),
    forget: () => change(() => forgetMemory()),
    setEnabled: (enabled) => change(() => setMemoryEnabled(enabled)),
  };
}
