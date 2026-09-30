import { useEffect, useState } from 'react';
import { draftFor, keepDraft } from './sourceDrafts.js';

// The source editor's unsaved text. `base` is the saved source the draft
// started from, which is what tells an edited draft from an untouched one.
// `id` is the document's: an edited draft is kept for it for the rest of
// the page's life (see sourceDrafts.js), so opening another document and
// coming back picks up where the person left off.
//
// When the document changes under the editor (a chat proposal applied, a
// version restored, even while another document was open) an untouched
// draft simply follows it. An edited one is never overwritten: it turns
// `stale`, and the person chooses to load the new source (dropping their
// edits) or keep editing (their Save then replaces it, as a new version
// that can itself be restored).
export function useSourceDraft(tex, id = null) {
  const [draft, setDraft] = useState(() => draftFor(id)?.draft ?? tex ?? '');
  const [base, setBase] = useState(() => draftFor(id)?.base ?? tex ?? '');

  useEffect(() => {
    if (tex === null || tex === undefined || tex === base || draft !== base) return;
    setDraft(tex);
    setBase(tex);
  }, [tex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    keepDraft(id, draft, base);
  }, [id, draft, base]);

  const dirty = draft !== base;

  return {
    draft,
    setDraft,
    dirty,
    stale: dirty && tex !== base,
    load: () => {
      setDraft(tex);
      setBase(tex);
    },
    keep: () => setBase(tex),
    discard: () => setDraft(base),
    // After a save the saved text is the new base, whatever the draft was.
    saved: (text) => {
      setDraft(text);
      setBase(text);
    },
  };
}
