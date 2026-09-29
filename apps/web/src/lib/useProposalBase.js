import { useEffect, useState } from 'react';
import { getDocument } from '../api.js';

// The source a document proposal was written against, for its "View
// changes". That is the version current when the chat proposed it
// (`baseAt`), not the document as it is now: once applied, the newest
// version IS the proposal, and a diff against it would show nothing. A
// version since pushed out of the kept twenty falls back to the current
// text. A new document has nothing before it, so every line reads as added.
//
//   { state: 'loading' | 'ready' | 'gone', tex }
export function useProposalBase({ documentId, baseAt }) {
  const [base, setBase] = useState(() => (documentId ? { state: 'loading', tex: '' } : { state: 'ready', tex: '' }));

  useEffect(() => {
    if (!documentId) return undefined;
    let alive = true;
    getDocument(documentId, { bodies: true })
      .then((doc) => {
        const version = (doc.versions ?? []).find((v) => v.at === baseAt);
        if (alive) setBase({ state: 'ready', tex: version?.tex ?? doc.tex ?? '' });
      })
      .catch(() => alive && setBase({ state: 'gone', tex: '' }));
    return () => {
      alive = false;
    };
  }, [documentId, baseAt]);

  return base;
}
