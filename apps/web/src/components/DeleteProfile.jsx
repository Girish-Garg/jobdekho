import { useState } from 'react';
import { deleteProfile } from '../api.js';

// Deleting throws away the stored resume text as well as the fields, and
// there is no undo, so the button arms instead of firing.
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

  if (!arming) {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setArming(true)}
          className="rounded-full border border-line px-4 py-1.5 text-sm text-muted transition hover:border-ink hover:text-ink"
        >
          Delete profile
        </button>
        {failed && <span className="text-sm text-ember">Could not delete.</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-ink">
        Removes the profile and the stored resume text. Recommended goes back to newest first.
      </p>
      <button
        type="button"
        onClick={confirm}
        className="rounded-full bg-ink px-4 py-1.5 text-sm font-medium text-paper transition hover:opacity-90"
      >
        Delete it
      </button>
      <button
        type="button"
        onClick={() => setArming(false)}
        className="rounded-full border border-line px-4 py-1.5 text-sm text-muted transition hover:border-ink hover:text-ink"
      >
        Keep it
      </button>
    </div>
  );
}
