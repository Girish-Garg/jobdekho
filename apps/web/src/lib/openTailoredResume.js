import { createDocument } from '../api.js';
import { requestOpenDocument } from './openDocumentSignal.js';

// "Make a resume from this" on a tailoring card: a new resume document
// drafted from that job's saved plan, its picks, order and reworded bullets
// (see the server's documents/first-draft.js), then opened in the Resume
// workspace. Classic is only where it starts; the chat there can restyle
// it like any other document. Asking to open it before going there is
// what lets the workspace, mounting on arrival, open this one first.
export async function openTailoredResume(posting, goToResume) {
  const doc = await createDocument({ kind: 'resume', templateId: 'classic', postingId: posting.id, fromPlan: true });
  requestOpenDocument(doc.id);
  goToResume?.();
  return doc;
}
