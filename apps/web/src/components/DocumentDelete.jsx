import { useState } from 'react';
import { usePopover } from '../lib/usePopover.js';
import { TrashIcon } from './Icon.jsx';

// Deleting takes every kept version with it and there is no undo, so the
// bin only asks; the ember button in the question is what deletes.
export default function DocumentDelete({ name, onDelete }) {
  const { open, setOpen, ref } = usePopover();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Delete this document"
        title="Delete this document"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-panel text-muted transition-colors duration-fast ease hover:border-ember/40 hover:text-ember"
      >
        <TrashIcon size={14} />
      </button>
      {open && (
        <div role="dialog" aria-label="Delete this document?" className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-ember/25 bg-overlay p-4 shadow-pop">
          <p className="break-words text-sm font-semibold text-ink">Delete &ldquo;{name}&rdquo;?</p>
          <p className="mt-1 text-xs text-muted">Every version goes with it. There is no undo.</p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn btn-quiet px-3.5 font-normal text-muted hover:text-ink">
              Keep it
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={confirm}
              className="rounded-full bg-ember px-3.5 py-1.5 text-sm font-semibold text-paper transition-opacity duration-fast ease hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Deleting...' : 'Delete it'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
