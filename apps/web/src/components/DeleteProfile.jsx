import { useState } from 'react';
import { deleteProfile } from '../api.js';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';

const MUTED = 'font-normal text-muted hover:text-ink';

// Deleting throws away the stored resume text as well as the fields, and
// there is no undo, so the button arms instead of firing. It sits apart at
// the foot of the record, in the warning colour, so it is never mistaken
// for the save.
export default function DeleteProfile({ onDeleted }) {
  const [arming, setArming] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    setFailed(false);
    try {
      await deleteProfile();
      onDeleted();
    } catch {
      setFailed(true);
    }
    // Disarm either way: the failure message renders next to the idle button.
    setArming(false);
  }

  return (
    <Card as="section" aria-label="Delete profile" className="flex flex-wrap items-center justify-between gap-3 border-ember/25 bg-ember/5 py-4">
      <div>
        <p className="text-sm font-semibold text-ember">Delete profile</p>
        <p className="text-sm text-muted">
          {arming ? 'Removes the profile and the stored resume text. Postings go back to newest first.' : 'Removes everything on this page. There is no undo.'}
        </p>
        {failed && <p className="text-sm text-ember">Could not delete.</p>}
      </div>
      {arming ? (
        <div className="flex items-center gap-2">
          <Button onClick={() => setArming(false)} className={MUTED}>Keep it</Button>
          <Button variant="danger" onClick={confirm}>Delete it</Button>
        </div>
      ) : (
        <Button onClick={() => setArming(true)} className={MUTED}>Delete profile</Button>
      )}
    </Card>
  );
}
