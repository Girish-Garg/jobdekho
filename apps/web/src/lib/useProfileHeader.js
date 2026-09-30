import { useEffect, useState } from 'react';
import { documentProfileHeader } from '../api.js';
import { notifyError } from './toast.js';

// The open document's header brought up to date from the profile, in two
// steps so nothing lands unseen: "Update from profile" fetches the source it
// would save, for review as a diff, and only Apply saves it. `review` is
// { fields, tex } while that diff is open; `busy` names the call in flight.
//
// A document that changes under an open review (a save, a restore, a chat
// change) closes it, since its diff was worked out from the old text.
export function useProfileHeader(doc, { onApplied, onKept }) {
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => setReview(null), [doc.tex]);

  async function run(action, title, done) {
    if (busy) return;
    setBusy(action);
    try {
      done(await documentProfileHeader(doc.id, action));
    } catch (err) {
      notifyError(err, title);
    } finally {
      setBusy(null);
    }
  }

  return {
    review,
    busy,
    start: () => run('preview', 'Could not read the header from your profile', setReview),
    apply: () => run('apply', 'Could not update the header', (next) => {
      setReview(null);
      onApplied(next);
    }),
    keep: () => run('keep', 'Could not keep this header', onKept),
    cancel: () => setReview(null),
  };
}
