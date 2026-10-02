import { useState } from 'react';
import { usePopover } from '../lib/usePopover.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import IconButton from './ui/IconButton.jsx';
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
      <IconButton
        label="Delete this document"
        title="Delete this document"
        size="md"
        outline
        tone="danger"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <TrashIcon size={14} />
      </IconButton>
      {open && (
        <Card variant="pop" className="pop-in absolute right-0 top-full z-30 mt-2 w-72 border-ember/25 p-4" as="div" role="dialog" aria-label="Delete this document?">
          <p className="break-words text-sm font-semibold text-ink">Delete &ldquo;{name}&rdquo;?</p>
          <p className="mt-1 text-xs text-muted">Every version goes with it. There is no undo.</p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="quiet" className="font-normal text-muted hover:text-ink" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={confirm}
            >
              {busy ? 'Deleting...' : 'Delete it'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
