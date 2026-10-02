import { useState } from 'react';
import { notifyError } from '../lib/toast.js';
import Button from './ui/Button.jsx';

// A save button with transient confirmation: in saffron, the colour the app
// gives the thing you act with, or quiet (`weight="quiet"`) where saving is
// not the point of the surface it sits on, like the filters' default.
export default function SaveBar({ onSave, label: idleLabel = 'Save changes', weight = 'primary' }) {
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
  const quiet = weight === 'quiet';

  return (
    <div className="flex items-center gap-3 pt-1">
      <Button
        variant={quiet ? 'quiet' : 'primary'}
        size={quiet ? 'sm' : undefined}
        className={quiet ? '' : 'px-5 py-2'}
        onClick={save}
        disabled={state === 'saving'}
      >
        {label}
      </Button>
      {state === 'error' && <span className="text-sm text-ember">Could not save.</span>}
    </div>
  );
}
