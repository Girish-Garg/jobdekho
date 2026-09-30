import { useEffect, useState } from 'react';
import { useDocuments } from '../lib/useDocuments.js';
import { useTemplates } from '../lib/useTemplates.js';
import { announceOpenDocument } from '../lib/openDocumentSignal.js';
import { dropDraft, useUnsavedDocuments } from '../lib/sourceDrafts.js';
import { notifyError } from '../lib/toast.js';
import DocumentList from './DocumentList.jsx';
import NewDocumentMenu from './NewDocumentMenu.jsx';
import DocumentPane from './DocumentPane.jsx';
import ResumeEmptyState from './ResumeEmptyState.jsx';

// The Resume page: the person's resumes and cover letters as LaTeX sources
// they own, listed on the left, the open one compiled beside it. There is
// nothing here to pick entries or layouts with: a document starts from a
// template, and every change after that is made in the chat pinned beside
// it (which sees the open document, see openDocumentSignal.js) or by hand
// in the source. Hand edits not saved yet are kept per document while the
// page is open (see lib/sourceDrafts.js), and marked in the list.
export default function ResumeWorkspace() {
  const docs = useDocuments();
  const templates = useTemplates();
  const [creating, setCreating] = useState(false);
  const unsaved = useUnsavedDocuments();
  const selected = docs.selected;

  useEffect(() => {
    if (docs.documents !== undefined) announceOpenDocument(selected);
  }, [docs.documents === undefined, selected?.id, selected?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(template) {
    setCreating(true);
    try {
      await docs.create(template);
    } catch (err) {
      notifyError(err, 'Could not start the document');
    } finally {
      setCreating(false);
    }
  }

  async function remove(id) {
    try {
      await docs.remove(id);
      dropDraft(id);
    } catch (err) {
      notifyError(err, 'Could not delete the document');
    }
  }

  if (docs.documents === undefined) return <p className="p-8 text-sm text-muted">Loading your documents...</p>;
  if (!docs.documents.length) return <ResumeEmptyState templates={templates} busy={creating} onPick={create} />;

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <DocumentList
        documents={docs.documents}
        unsaved={unsaved}
        selectedId={selected?.id}
        onSelect={docs.select}
        newMenu={<NewDocumentMenu templates={templates} busy={creating} onPick={create} />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {selected && <DocumentPane key={selected.id} id={selected.id} onChanged={() => docs.refresh()} onDelete={() => remove(selected.id)} />}
      </div>
    </div>
  );
}
