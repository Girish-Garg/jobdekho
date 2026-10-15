import { useState } from 'react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import IconButton from './ui/IconButton.jsx';
import TextInput from './ui/TextInput.jsx';
import TrackerTimeline from './TrackerTimeline.jsx';
import TrackerStepper from './TrackerStepper.jsx';
import { flagOf, requestFor } from '../lib/trackerBoard.js';
import { startChatDraft } from '../lib/chatDraftSignal.js';
import { CloseIcon, MailIcon } from './Icon.jsx';

// What to start in the chat to mail about this one: its contact when it has
// one, else a request with the address left for the person to type.
function mailDraft(entry) {
  const about = [entry.role, entry.company].filter(Boolean).join(' at ');
  if (entry.contact?.email) return `Email ${entry.contact.email} about ${about}: `;
  return `Email someone at ${entry.company}${entry.role ? ` about ${entry.role}` : ''}. Their address: `;
}

// The open application, laid over the board's right edge (see
// TrackerBoard.jsx): who, the next step when one waits on the person, the
// stage bar, the history, a note, and mail to write in the chat, where it
// is seen before it goes.
export default function TrackerDetail({ entry, onClose, onUpdate, onRemove }) {
  const [note, setNote] = useState('');
  const [removing, setRemoving] = useState(false);
  const flag = flagOf(entry);
  const request = requestFor(entry);
  const origin = entry.contact ? [entry.contact.name, entry.contact.email].filter(Boolean).join(', ') : entry.events?.find((event) => event.from)?.from;

  return (
    <Card as="aside" variant="pop" aria-label={`${entry.company}, details`} className="absolute inset-y-0 right-0 z-10 flex w-[min(26rem,100%)] flex-col gap-5 overflow-y-auto p-5">
      <header className="flex items-start gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink">{entry.company}</h2>
          <p className="text-sm text-ink/80">{entry.role || 'No role given'}</p>
          {origin && <p className="text-xs text-muted">{origin}</p>}
        </div>
        <IconButton label="Close" className="ml-auto" onClick={onClose}><CloseIcon size={16} /></IconButton>
      </header>

      {flag?.next && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-3">
          <p className="flex-1 text-sm font-medium text-primary">{flag.next}</p>
          {request && <Button variant="primary" size="sm" onClick={() => startChatDraft(request)}>{flag.action}</Button>}
        </div>
      )}

      <TrackerStepper stage={entry.stage} onPick={(stage) => onUpdate(entry.id, { stage })} />

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

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Button onClick={() => startChatDraft(mailDraft(entry))}><MailIcon size={14} />{entry.contact?.email ? `Email ${entry.contact.name || 'them'}` : 'Email someone there'}</Button>
        {removing
          ? <Button variant="danger" onClick={() => onRemove(entry.id)}>Yes, stop tracking</Button>
          : <Button onClick={() => setRemoving(true)}>Stop tracking</Button>}
      </div>
    </Card>
  );
}
