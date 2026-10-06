import Button from './ui/Button.jsx';

// A memory chip's buttons by where it stands (see MemoryChip.jsx): Save and
// Cancel while its words are edited; Undo or Edit once kept; Save, Edit or
// Not now while it waits; none after Not now.
export default function MemoryChipButtons({ chip }) {
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
