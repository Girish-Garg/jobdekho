import { useEffect, useState } from 'react';
import { getDocument, saveDocument, revertDocument } from '../api.js';
import { onApplied } from './proposalAppliedSignal.js';

// The one open document, source and history (without the old sources: the
// version list needs only times and authors). A chat proposal applied to it
// arrives as the saved document itself, so the preview recompiles from what
// the server now holds without a second read.
//
//   doc: undefined while loading, null when it is gone, else the document
export function useDocument(id) {
  const [doc, setDoc] = useState(undefined);

  useEffect(() => {
    let alive = true;
    setDoc(undefined);
    getDocument(id)
      .then((found) => alive && setDoc(found))
      .catch(() => alive && setDoc(null));
    const stop = onApplied((outcome) => outcome?.document?.id === id && setDoc(outcome.document));
    return () => {
      alive = false;
      stop();
    };
  }, [id]);

  // Each resolves with the document as saved, so a caller can move on from
  // exactly that (the source editor rebases its draft on it).
  async function save(patch) {
    const next = await saveDocument(id, patch);
    setDoc(next);
    return next;
  }

  async function restore(at) {
    const next = await revertDocument(id, at);
    setDoc(next);
    return next;
  }

  // A document another call already saved (the header brought up to date
  // from the profile, or kept), taken exactly as the server answered it.
  const replace = (next) => setDoc(next);

  return { doc, save, restore, replace };
}
