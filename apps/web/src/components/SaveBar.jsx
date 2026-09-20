import { useState } from 'react';
import { notifyError } from '../lib/toast.js';

// Primary-action save button with transient confirmation. Ink, not ember: the
// accent is reserved for "new today" in the feed, and a second ember element on
// screen means there is no accent, only two loud things.
export default function SaveBar({ onSave, label: idleLabel = 'Save changes' }) {
  const [state, setState] = useState('idle');

  async function save() {
    setState('saving');
    try {
      await onSave();
      setState('saved');
      setTimeout(() => setState('idle'), 1800);
    } catch (err) {
      // The button beside it only ever says "Could not save."; this is
      // where the actual reason goes, since Settings and Profile are both
      // screens a person can be scrolled well past the button on.
      setState('error');
      notifyError(err, idleLabel);
    }
  }

  const label = { idle: idleLabel, saving: 'Saving...', saved: 'Saved', error: 'Retry' }[state];

  return (
    <div className="flex items-center gap-3 pt-1">
      <button
        onClick={save}
        disabled={state === 'saving'}
        className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-60"
      >
        {label}
      </button>
      {state === 'error' && <span className="text-sm text-ember">Could not save.</span>}
    </div>
  );
}
