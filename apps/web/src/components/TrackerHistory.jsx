import { useState } from 'react';
import Button from './ui/Button.jsx';
import TextInput from './ui/TextInput.jsx';
import { STAGE_WORD, when } from '../lib/trackerStages.js';

// An entry's history, newest first, with a line to add a note of its own
// (a call, a date to remember) and the way to stop tracking it.
export default function TrackerHistory({ entry, onNote, onRemove }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const events = [...(entry.events ?? [])].reverse();

  async function add(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await onNote(note);
      setNote('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2">
      <ol className="flex flex-col gap-1.5 text-sm">
        {events.map((event) => (
          <li key={event.id} className="flex gap-3">
            <span className="w-24 shrink-0 text-muted">{when(event.at)}</span>
            <span className="min-w-0 text-ink/90">
              {event.stage && <span className="font-medium text-ink">{STAGE_WORD[event.stage]}. </span>}
              {event.text}
            </span>
          </li>
        ))}
      </ol>
      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <TextInput aria-label="Add a note" className="min-w-0 flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" />
        <Button type="submit" disabled={busy || !note.trim()}>Add note</Button>
        <button type="button" onClick={onRemove} className="text-sm font-medium text-ember hover:underline">Stop tracking</button>
      </form>
    </div>
  );
}
