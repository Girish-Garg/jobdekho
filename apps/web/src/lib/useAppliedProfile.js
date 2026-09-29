import { useEffect, useState } from 'react';
import { onApplied } from './proposalAppliedSignal.js';

// A chat proposal applied to the profile while the Profile page is open
// (see proposalAppliedSignal.js). With nothing unsaved on the page, the
// record the server saved simply replaces the one on screen. With unsaved
// edits, those are never overwritten silently: the saved copy moves on
// under them (so Discard now goes back to the applied version) and
// `incoming` holds the applied record until the person chooses to load it,
// dropping their edits, or keep editing, in which case their next save
// writes over the chat's change like any other save would.
export function useAppliedProfile({ dirty, replace, rebase }) {
  const [incoming, setIncoming] = useState(null);

  // Bound again whenever `dirty` flips, so the choice is made on the page's
  // state at the moment the change arrives rather than when it first loaded.
  useEffect(() => onApplied((outcome) => {
    if (outcome?.kind !== 'profile' || !outcome.profile) return;
    if (!dirty) {
      replace(outcome.profile);
      setIncoming(null);
      return;
    }
    rebase(outcome.profile);
    setIncoming(outcome.profile);
  }), [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    incoming,
    load: () => {
      if (incoming) replace(incoming);
      setIncoming(null);
    },
    keep: () => setIncoming(null),
  };
}
