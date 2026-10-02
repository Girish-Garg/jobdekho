import { useMemoryChip } from '../lib/useMemoryChip.js';
import { MAX_MEMORY_TEXT } from '../lib/memoryScopes.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import TextInput from './ui/TextInput.jsx';
import { NoteIcon } from './IconMemory.jsx';
import { CheckIcon } from './Icon.jsx';

// Saffron while it waits for the person, green once kept, greyed after Not
// now: the same three tones a proposal card moves through (see
// ProposalCard.jsx), smaller, since a line to remember is a side note to the
// answer rather than a change to look over. The greyed one has no wash, so it
// clears the card's own.
const FRAME = {
  suggested: 'border-primary/30 bg-primary/5',
  saved: 'border-applied/30 bg-applied/5',
  dismissed: 'bg-transparent opacity-70',
};

const TILE = {
  suggested: 'bg-primary/10 text-primary',
  saved: 'bg-applied/15 text-applied',
  dismissed: 'bg-ink/5 text-muted',
};

const WORDS = {
  suggested: (text) => `Remember: '${text}'?`,
  saved: (text) => `Remembered: '${text}'`,
  dismissed: (text) => `Not saved: '${text}'`,
};

function Buttons({ chip }) {
  const busy = Boolean(chip.busy);
  if (chip.draft !== null) {
    return (
      <>
        <Button variant="primary" size="sm" onClick={chip.save} disabled={busy || !chip.draft.trim()}>
          {chip.busy === 'save' ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="ghost" size="sm" onClick={chip.cancel} disabled={busy}>Cancel</Button>
      </>
    );
  }
  if (chip.status === 'saved') {
    return (
      <>
        <Button size="sm" onClick={chip.undo} disabled={busy}>{chip.busy === 'undo' ? 'Undoing...' : 'Undo'}</Button>
        <Button variant="ghost" size="sm" onClick={chip.edit} disabled={busy}>Edit</Button>
      </>
    );
  }
  if (chip.status === 'dismissed') return null;
  return (
    <>
      <Button variant="primary" size="sm" onClick={chip.save} disabled={busy}>{chip.busy === 'save' ? 'Saving...' : 'Save'}</Button>
      <Button size="sm" onClick={chip.edit} disabled={busy}>Edit</Button>
      <Button variant="ghost" size="sm" onClick={chip.dismiss} disabled={busy}>Not now</Button>
    </>
  );
}

// One thing the chat offered to remember from the person's message: Save,
// Edit or Not now while it waits; Undo or Edit once kept, whether by that
// Save or because the message itself said "remember".
export default function MemoryChip({ memory }) {
  const chip = useMemoryChip(memory);
  const editing = chip.draft !== null;
  const replaced = chip.replacedText && chip.status !== 'dismissed';
  const keys = (event) => {
    if (event.key === 'Enter' && chip.draft.trim()) chip.save();
    if (event.key === 'Escape') chip.cancel();
  };

  return (
    <Card
      variant="inset"
      role="group"
      aria-label={`Memory: ${chip.text}`}
      data-status={chip.status}
      className={`flex flex-col gap-1.5 px-3 py-2 transition-opacity duration-slow ${FRAME[chip.status]}`}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
        <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${TILE[chip.status]}`}>
          {chip.status === 'saved' ? <CheckIcon size={12} /> : <NoteIcon size={12} />}
        </span>
        {editing ? (
          <TextInput aria-label="What to remember" autoFocus maxLength={MAX_MEMORY_TEXT} value={chip.draft} onChange={(event) => chip.setDraft(event.target.value)} onKeyDown={keys} className="min-w-0 flex-1" />
        ) : (
          <p className="min-w-0 flex-1 text-sm text-ink">{WORDS[chip.status](chip.text)}</p>
        )}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Buttons chip={chip} />
        </div>
      </div>
      {replaced && <p className="pl-8 text-xs text-muted">{`${chip.status === 'saved' ? 'Replaced' : 'Replaces'}: '${chip.replacedText}'`}</p>}
      {chip.error && <p role="alert" className="pl-8 text-xs text-ember">{chip.error}</p>}
    </Card>
  );
}
