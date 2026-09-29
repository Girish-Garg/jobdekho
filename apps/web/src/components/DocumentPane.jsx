import { useState } from 'react';
import { useDocument } from '../lib/useDocument.js';
import { useDocumentPdf } from '../lib/useDocumentPdf.js';
import { useSourceDraft } from '../lib/useSourceDraft.js';
import DocumentToolbar from './DocumentToolbar.jsx';
import DocumentPreview from './DocumentPreview.jsx';
import DocumentSource from './DocumentSource.jsx';

// The open document: its toolbar, then the PDF or the source. The source's
// unsaved draft lives here rather than in the editor, so flipping to the
// preview and back does not lose it. `onChanged` tells the list a save or a
// restore moved this document to the top.
export default function DocumentPane({ id, onChanged, onDelete }) {
  const { doc, save, restore } = useDocument(id);
  const pdf = useDocumentPdf(doc);
  const draft = useSourceDraft(doc?.tex);
  const [view, setView] = useState('preview');

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
      />
      {view === 'source'
        ? <DocumentSource draft={draft} pdf={pdf} onSave={saveSource} />
        : <DocumentPreview pdf={pdf} onOpenSource={() => setView('source')} />}
    </div>
  );
}
