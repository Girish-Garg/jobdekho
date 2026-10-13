import { useEffect, useState } from 'react';
import { useDocuments } from '../lib/useDocuments.js';
import { useTemplates } from '../lib/useTemplates.js';
import { announceOpenDocument } from '../lib/openDocumentSignal.js';
import { onReviewRequest, takeReviewRequest, waitingReview } from '../lib/openReviewSignal.js';
import { dropDraft, useUnsavedDocuments } from '../lib/sourceDrafts.js';
import { notifyError } from '../lib/toast.js';
import DocumentList from './DocumentList.jsx';
import NewDocumentMenu from './NewDocumentMenu.jsx';
import DocumentPane from './DocumentPane.jsx';
import ResumeEmptyState from './ResumeEmptyState.jsx';
import TailorReviewPage from './TailorReviewPage.jsx';

// No document open, which is how the page starts: nothing is put in the
// chat beside it until the person opens one (see lib/useDocuments.js).
function NothingOpen() {
  return (
    <div className="grid flex-1 place-items-center p-8">
      <p className="max-w-sm text-center text-sm text-muted">Open a resume or cover letter from the list to see it here and work on it with the chat. With none open, the chat answers anything in general.</p>
    </div>
  );
}

// The Resume page: the person's resumes and cover letters as LaTeX sources
// they own, listed on the left, the open one compiled beside it. There is
// nothing here to pick entries or layouts with: a document starts from a
// template, and every change after that is made in the chat pinned beside
// it (which sees the open document, see openDocumentSignal.js) or by hand
// in the source. Hand edits not saved yet are kept per document while the
// page is open (see lib/sourceDrafts.js), and marked in the list.
//
// One thing takes the whole page over: a tailoring's review, asked for by
// its card in the chat (see lib/openReviewSignal.js), which needs the room.
// The resume made there is opened here like any other document.
export default function ResumeWorkspace() {
  const docs = useDocuments();
  const templates = useTemplates();
  const [creating, setCreating] = useState(false);
  const unsaved = useUnsavedDocuments();
  const [review, setReview] = useState(waitingReview);
  const selected = docs.selected;

  // Taken once the page is up, so coming back here later opens no review.
  useEffect(() => {
    takeReviewRequest();
    return onReviewRequest(() => setReview(takeReviewRequest()));
  }, []);

  // No document is open to the chat while a review covers it.
  useEffect(() => {
    if (docs.documents !== undefined) announceOpenDocument(review ? null : selected);
  }, [docs.documents === undefined, selected?.id, selected?.name, Boolean(review)]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function made(doc) {
    setReview(null);
    docs.refresh(doc.id);
  }

  if (review) return <TailorReviewPage key={review.id} job={review} onClose={() => setReview(null)} onMade={made} />;
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
        {selected
          ? <DocumentPane key={selected.id} id={selected.id} onChanged={() => docs.refresh()} onDelete={() => remove(selected.id)} onClose={() => docs.select(null)} />
          : <NothingOpen />}
      </div>
    </div>
  );
}
