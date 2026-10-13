import { overBy } from '../lib/pdfLength.js';
import Button from './ui/Button.jsx';
import Chip from './ui/Chip.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import IconButton from './ui/IconButton.jsx';
import { CloseIcon, DocumentIcon } from './Icon.jsx';

// The bar over a tailoring's review: which job it is for, how long the page
// beside it runs right now, and the one thing the screen is for, making the
// resume. Closing keeps every choice: they are saved as they are made.
export default function TailorReviewBar({ posting, length, making, onMake, onClose }) {
  const job = [posting.title, posting.company].filter(Boolean).join(' at ') || 'this job';

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <Eyebrow primary>Tailored resume</Eyebrow>
        <p className="truncate text-sm font-semibold text-ink">{job}</p>
      </div>
      {length && (
        <Chip tone={length.pages > 1 ? 'primary' : 'quiet'} className="shrink-0">
          {length.pages === 1 ? '1 page' : `${length.pages} pages${overBy(length)}`}
        </Chip>
      )}
      <Button variant="primary" size="sm" disabled={making} onClick={onMake} className="shrink-0">
        <DocumentIcon size={14} />
        Make the resume
      </Button>
      <IconButton label="Close the review" onClick={onClose}><CloseIcon size={14} /></IconButton>
    </div>
  );
}
