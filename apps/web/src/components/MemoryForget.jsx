import { useState } from 'react';

const QUIET = 'btn btn-quiet font-normal text-muted hover:text-ink';

// "Forget everything" arms instead of firing, the way deleting the profile
// does (see DeleteProfile.jsx): there is no undo, and it takes the replaced
// lines kept for an Undo as well. The confirmation sits where the button
// was, in the warning colour, so it is never mistaken for a Save.
export default function MemoryForget({ busy, onForget }) {
  const [arming, setArming] = useState(false);

  if (!arming) {
    return (
      <div className="flex justify-end">
        <button type="button" onClick={() => setArming(true)} className="btn btn-ghost btn-sm">Forget everything</button>
      </div>
    );
  }

  async function confirm() {
    await onForget();
    setArming(false);
  }

  return (
    <div role="group" aria-label="Forget everything" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ember/25 bg-ember/5 px-4 py-3">
      <p className="text-sm text-ember">Everything the AI knows about you goes, and there is no undo.</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setArming(false)} className={QUIET}>Keep it</button>
        <button
          type="button"
          disabled={busy}
          onClick={confirm}
          className="rounded-full bg-ember px-4 py-1.5 text-sm font-semibold text-paper transition-opacity duration-fast ease hover:opacity-90 disabled:opacity-60"
        >
          Forget it all
        </button>
      </div>
    </div>
  );
}
