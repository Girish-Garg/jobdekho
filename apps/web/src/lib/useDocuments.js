import { useEffect, useState } from 'react';
import { listDocuments, createDocument, deleteDocument } from '../api.js';
import { onApplied } from './proposalAppliedSignal.js';
import { onOpenDocumentRequest, takeOpenRequest } from './openDocumentSignal.js';

// The asked-for document if the list has it, else the one already open,
// else the newest: the list comes newest first, which is the one a person
// coming back to this page was most likely working on.
function pick(list, wanted, open) {
  if (wanted && list.some((doc) => doc.id === wanted)) return wanted;
  if (open && list.some((doc) => doc.id === open)) return open;
  return list[0]?.id ?? null;
}

// The Resume workspace's list and which document in it is open. Three
// things besides the person's own clicks change it: the chat asking for a
// document it made to be opened (a tailored resume, see openDocumentSignal
// .js), a chat proposal applied to a document (which may be a new one), and
// the workspace's own create and delete.
//
// `documents` is undefined while the first read is in flight.
export function useDocuments() {
  const [documents, setDocuments] = useState(undefined);
  const [selectedId, setSelectedId] = useState(null);

  async function refresh(wanted = null) {
    let list;
    try {
      list = await listDocuments();
    } catch {
      // Already announced by the api layer; an empty workspace is the
      // honest fallback for a list that did not load.
      setDocuments((now) => now ?? []);
      return;
    }
    setDocuments(list);
    setSelectedId((open) => pick(list, wanted, open));
  }

  useEffect(() => {
    refresh(takeOpenRequest());
    const stopRequests = onOpenDocumentRequest(() => refresh(takeOpenRequest()));
    const stopApplied = onApplied((outcome) => outcome?.document && refresh(outcome.document.id));
    return () => {
      stopRequests();
      stopApplied();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function create(template) {
    const doc = await createDocument({ kind: template.kind, templateId: template.id });
    await refresh(doc.id);
    return doc;
  }

  async function remove(id) {
    await deleteDocument(id);
    await refresh();
  }

  const selected = documents?.find((doc) => doc.id === selectedId) ?? null;
  return { documents, selected, select: setSelectedId, create, remove, refresh };
}
