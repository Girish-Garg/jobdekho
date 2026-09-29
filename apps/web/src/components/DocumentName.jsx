import { useRef, useState } from 'react';
import { notifyError } from '../lib/toast.js';
import { PenIcon } from './Icon.jsx';

// The document's name as the toolbar's heading, renamed in place: a click
// turns it into a box, Enter or leaving it saves, Escape puts it back. Both
// ways out go through the blur, so a rename is sent once however it ended.
export default function DocumentName({ name, onRename }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const cancelled = useRef(false);

  async function commit() {
    setEditing(false);
    const next = value.replace(/\s+/g, ' ').trim();
    if (cancelled.current || !next || next === name) {
      cancelled.current = false;
      setValue(name);
      return;
    }
    try {
      await onRename(next);
    } catch (err) {
      setValue(name);
      notifyError(err, 'Could not rename the document');
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') cancelled.current = true;
    if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur();
  }

  if (editing) {
    return (
      <input
        autoFocus
        aria-label="Document name"
        value={value}
        maxLength={120}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className="min-w-0 flex-1 rounded-lg border border-primary/50 bg-paper px-2 py-1 font-display text-md font-bold text-ink outline-none ring-4 ring-primary/15 focus-visible:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      title="Rename"
      aria-label={`Rename ${name}`}
      onClick={() => {
        setValue(name);
        setEditing(true);
      }}
      className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors duration-fast ease hover:bg-select/60"
    >
      <span className="truncate font-display text-md font-bold text-ink">{name}</span>
      <PenIcon size={13} className="text-muted opacity-0 transition-opacity duration-fast ease group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}
