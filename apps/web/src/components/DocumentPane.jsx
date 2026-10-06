import { useState } from 'react';
import { useDocument } from '../lib/useDocument.js';
import { useDocumentPdf } from '../lib/useDocumentPdf.js';
import { useSourceDraft } from '../lib/useSourceDraft.js';
import { draftFor } from '../lib/sourceDrafts.js';
import DocumentToolbar from './DocumentToolbar.jsx';
import DocumentPreview from './DocumentPreview.jsx';
import DocumentSource from './DocumentSource.jsx';
import ProfileHeaderNotice from './ProfileHeaderNotice.jsx';

// The open document: its toolbar, then the PDF or the source, under an
// offer to bring its header up to date when the profile changed since it
// was made. The source's unsaved draft lives here rather than in the
// editor, so flipping to the preview and back does not lose it, and is kept
// per document for the page's life (see lib/sourceDrafts.js), so opening
// another document and back does not either; a document opened with a
// draft waiting opens on its source, where the draft is. `onChanged` tells
// the list a save, a restore or a header update moved this document to the
// top.
export default function DocumentPane({ id, onChanged, onDelete, onClose }) {
  const { doc, save, restore, replace } = useDocument(id);
  const pdf = useDocumentPdf(doc);
  const draft = useSourceDraft(doc?.tex, id);
  const [view, setView] = useState(() => (draftFor(id) ? 'source' : 'preview'));

  if (doc === undefined) return <p className="p-6 text-sm text-muted">Opening the document...</p>;
  if (doc === null) return <p className="p-6 text-sm text-muted">That document is not there any more.</p>;

  async function saved(patch) {
    const next = await save(patch);
    onChanged();
    return next;
  }

  async function saveSource() {
    const next = await saved({ tex: draft.draft });
    draft.saved(next.tex);
  }

  async function restoreVersion(at) {
    await restore(at);
    onChanged();
  }

  function headerApplied(next) {
    replace(next);
    onChanged();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DocumentToolbar
        doc={doc}
        pdf={pdf}
        view={view}
        onView={setView}
        dirty={draft.dirty}
        onRename={(name) => saved({ tex: doc.tex, name })}
        onRestore={restoreVersion}
        onDelete={onDelete}
        onClose={onClose}
      />
      {doc.profileHeader && <ProfileHeaderNotice doc={doc} onApplied={headerApplied} onKept={replace} />}
      {view === 'source'
        ? <DocumentSource draft={draft} pdf={pdf} onSave={saveSource} />
        : <DocumentPreview pdf={pdf} onOpenSource={() => setView('source')} />}
    </div>
  );
}
