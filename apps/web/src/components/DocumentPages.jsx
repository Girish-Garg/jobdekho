import { startChatDraft } from '../lib/chatDraftSignal.js';
import { overBy } from '../lib/pdfLength.js';
import Chip from './ui/Chip.jsx';
import DocumentToolButton from './DocumentToolButton.jsx';
import { SparkleIcon } from './Icon.jsx';

// What the person will ask the chat beside the document: for a list to pick
// from, not for a squeeze. Asked to "make it fit", a model shrinks margins
// and spacing until it does, which fits and reads badly.
const request = (length) => `This runs to ${length.pages} pages${overBy(length)}. What would you remove to fit it on one page? List the options, least useful first, and I will pick. Do not shrink the spacing, margins or font.`;

// How long the compiled document runs, in the bar above it: a resume or a
// letter that spills onto a second page says so, and by about how much. The
// button beside it puts the request to fix that in the chat's box (see
// lib/chatDraftSignal.js), for the person to send or change; the chat then
// proposes the cut as it does any other edit. `length` is null while nothing
// is compiled, or when the server could not measure the PDF.
export default function DocumentPages({ length }) {
  if (!length) return null;
  if (length.pages === 1) return <Chip className="shrink-0">1 page</Chip>;

  return (
    <>
      <Chip tone="primary" className="shrink-0">{length.pages} pages{overBy(length)}</Chip>
      <DocumentToolButton label="Ask the chat to fit this on one page" onClick={() => startChatDraft(request(length))}>
        <SparkleIcon size={12} className="text-primary" />
        Fit on one page
      </DocumentToolButton>
    </>
  );
}
