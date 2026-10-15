import { useState } from 'react';
import Button from './ui/Button.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import TextInput from './ui/TextInput.jsx';
import TrackerTimeline from './TrackerTimeline.jsx';
import TrackerStepper from './TrackerStepper.jsx';
import { flagOf, requestFor } from '../lib/trackerBoard.js';
import { startChatDraft } from '../lib/chatDraftSignal.js';

// The sidebar's scrolling middle: the next step when one waits on the
// person, the stage bar, the history and a note.
export default function TrackerDetailBody({ entry, onUpdate }) {
  const [note, setNote] = useState('');
  const flag = flagOf(entry);
  const request = requestFor(entry);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
      {flag?.next && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-3">
          <p className="flex-1 text-sm font-medium text-primary">{flag.next}</p>
          {request && <Button variant="primary" size="sm" onClick={() => startChatDraft(request)}>{flag.action}</Button>}
        </div>
      )}
      <section className="flex flex-col gap-2.5">
        <Eyebrow>Stage</Eyebrow>
        <TrackerStepper stage={entry.stage} onPick={(stage) => onUpdate(entry.id, { stage })} />
      </section>
      <section className="flex flex-col gap-2.5">
        <Eyebrow>History</Eyebrow>
        <TrackerTimeline events={entry.events} />
      </section>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!note.trim()) return;
          onUpdate(entry.id, { note });
          setNote('');
        }}
      >
        <TextInput aria-label="Add a note" className="min-w-0 flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" />
        <Button type="submit" disabled={!note.trim()}>Add</Button>
      </form>
    </div>
  );
}
