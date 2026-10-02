import { useState } from 'react';
import { MEMORY_SCOPES, MAX_MEMORY_TEXT } from '../lib/memoryScopes.js';
import { BOX } from './ProfileField.jsx';
import Select from './Select.jsx';

const BLANK = { text: '', scope: 'everywhere' };

// A line to remember and where it applies, for writing one by hand or
// changing one already kept. Nothing is saved until Save, and the caller
// closes the form only once the server took it, so a refusal leaves the
// words in place to fix.
export default function MemoryForm({ label, initial = BLANK, busy, onSave, onCancel }) {
  const [text, setText] = useState(initial.text);
  const [scope, setScope] = useState(initial.scope);

  function submit(event) {
    event.preventDefault();
    if (text.trim()) onSave(text, scope);
  }

  return (
    <form aria-label={label} onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        aria-label="What to remember"
        autoFocus
        maxLength={MAX_MEMORY_TEXT}
        placeholder="e.g. Keep my resume to one page"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={`${BOX} min-w-0 flex-1`}
      />
      <Select aria-label="Where it applies" value={scope} onChange={(event) => setScope(event.target.value)} className={BOX}>
        {MEMORY_SCOPES.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </Select>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="submit" disabled={busy || !text.trim()} className="btn btn-primary btn-sm">Save</button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
      </div>
    </form>
  );
}
