import { createDocument } from '../api.js';
import { requestOpenDocument } from './openDocumentSignal.js';

// The cover letter card's two buttons. Both make documents with no AI call
// of their own (see the server's documents/first-draft.js), from the
// letter's words as the person left them in the card, edits included.
//
// "Just the letter": the cover letter document, opened on the Resume page.
//
// "Make both": the letter, and beside it a resume tailored to the same job.
// A tailoring already saved for this job is used as it is; without one,
// `tailor` runs it first (the chat's own resume-tailor action, which shows
// its card and its wait like any other) and the resume is made once it is
// back. The resume is what opens, since the letter is the one just read;
// both are in the document list. A tailoring that fails leaves the letter
// made and opened, and says why through the action's own failure.
async function letter(posting, text) {
  return createDocument({ kind: 'cover-letter', templateId: 'letter', postingId: posting.id, text });
}

function open(doc, goToResume) {
  requestOpenDocument(doc.id);
  goToResume?.();
  return doc;
}

export async function makeLetterDoc({ posting, text, goToResume }) {
  return open(await letter(posting, text), goToResume);
}

export async function makeApplicationDocs({ posting, text, tailored, tailor, goToResume }) {
  const made = await letter(posting, text);
  const planned = tailored || Boolean(await tailor());
  if (!planned) return { letter: open(made, goToResume), resume: null };
  const resume = await createDocument({ kind: 'resume', templateId: 'classic', postingId: posting.id, fromPlan: true });
  return { letter: made, resume: open(resume, goToResume) };
}
