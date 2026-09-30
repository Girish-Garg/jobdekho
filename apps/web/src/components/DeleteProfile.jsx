import { useState } from 'react';
import { deleteProfile } from '../api.js';

const QUIET = 'btn btn-quiet font-normal text-muted hover:text-ink';

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
    <section aria-label="Delete profile" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ember/25 bg-ember/5 px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-ember">Delete profile</p>
        <p className="text-sm text-muted">
          {arming ? 'Removes the profile and the stored resume text. Best fit goes back to newest first.' : 'Removes everything on this page. There is no undo.'}
        </p>
        {failed && <p className="text-sm text-ember">Could not delete.</p>}
      </div>
      {arming ? (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setArming(false)} className={QUIET}>Keep it</button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-full bg-ember px-4 py-1.5 text-sm font-semibold text-paper transition-opacity duration-fast ease hover:opacity-90"
          >
            Delete it
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setArming(true)} className={QUIET}>Delete profile</button>
      )}
    </section>
  );
}
