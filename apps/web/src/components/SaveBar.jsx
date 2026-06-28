import { useState } from 'react';

// Primary-action save button with transient confirmation.
export default function SaveBar({ onSave }) {
  const [state, setState] = useState('idle');

  async function save() {
    setState('saving');
    try {
      await onSave();
      setState('saved');
      setTimeout(() => setState('idle'), 1800);
    } catch {
      setState('error');
    }
  }

  const label = { idle: 'Save changes', saving: 'Saving...', saved: 'Saved', error: 'Retry' }[state];

  return (
    <div className="flex items-center gap-3 pt-1">
      <button
        onClick={save}
        disabled={state === 'saving'}
        className="rounded-full bg-ember px-5 py-2 text-sm font-medium text-paper transition hover:opacity-90 disabled:opacity-60"
      >
        {label}
      </button>
      {state === 'error' && <span className="text-sm text-ember">Could not save.</span>}
    </div>
  );
}
