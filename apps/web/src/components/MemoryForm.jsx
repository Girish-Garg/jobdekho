import { useState } from 'react';
import { MEMORY_SCOPES, MAX_MEMORY_TEXT } from '../lib/memoryScopes.js';
import Select from './Select.jsx';
import Button from './ui/Button.jsx';
import TextInput from './ui/TextInput.jsx';

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
      <TextInput
        aria-label="What to remember"
        autoFocus
        maxLength={MAX_MEMORY_TEXT}
        placeholder="e.g. Keep my resume to one page"
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="min-w-0 flex-1"
      />
      <Select aria-label="Where it applies" value={scope} onChange={(event) => setScope(event.target.value)} className="field">
        {MEMORY_SCOPES.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
      </Select>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button type="submit" variant="primary" size="sm" disabled={busy || !text.trim()}>Save</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
