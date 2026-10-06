import { useState } from 'react';
import { notify, notifyError } from '../lib/toast.js';
import Button from './ui/Button.jsx';
import { BookmarkIcon } from './Icon.jsx';

// The filters on screen are not the ones JobDekho opens with: a quiet way to
// make them so, in the row of what is on, where the person is already
// looking. A save button at the foot of More filters was easy to forget.
// Saving says so in a toast, and the button goes with nothing left to save.
const HINT = 'Open JobDekho with these filters every time. The search, companies, status and fit floor stay for this visit only.';

export default function SaveFiltersButton({ onSave }) {
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await onSave();
      notify({ kind: 'done', title: 'Filters saved', detail: 'JobDekho opens with them from now on.' });
    } catch (err) {
      notifyError(err, 'Could not save the filters');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" title={HINT} onClick={save} disabled={busy} className="ml-auto gap-1.5 px-2 text-primary hover:bg-primary/10">
      <BookmarkIcon size={12} />
      {busy ? 'Saving...' : 'Save as default'}
    </Button>
  );
}
