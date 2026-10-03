import { useState } from 'react';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import { DocumentIcon, SparkleIcon } from './Icon.jsx';

// What the letter becomes next: a cover letter document, or that and a
// resume tailored to the same job in one go (see lib/makeApplicationDocs.js).
// Both take the text as it is in the box above, edits included. When the job
// has no tailoring yet, the saffron button says it will run one first, since
// that is an AI call of its own and takes as long as one; while another call
// runs it waits, with why as its tooltip (`waitReason`), rather than making
// the letter alone and saying nothing.
export default function CoverLetterDocs({ text, tailored, waitReason = null, onMakeLetter, onMakeBoth }) {
  const [busy, setBusy] = useState(null);
  if (!onMakeLetter && !onMakeBoth) return null;
  const waits = !tailored && Boolean(waitReason);

  async function run(which, make) {
    setBusy(which);
    try {
      await make();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card variant="inset" className="flex flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {onMakeBoth && (
          <Button variant="primary" disabled={Boolean(busy) || waits} title={waits ? waitReason : undefined} onClick={() => run('both', () => onMakeBoth(text, tailored))}>
            <SparkleIcon size={14} />
            {busy === 'both' ? 'Making them...' : tailored ? 'Make the letter and a tailored resume' : 'Tailor my resume and make both'}
          </Button>
        )}
        {onMakeLetter && (
          <Button variant="quiet" className="font-medium" disabled={Boolean(busy)} onClick={() => run('letter', () => onMakeLetter(text))}>
            <DocumentIcon size={14} />
            {busy === 'letter' ? 'Making it...' : 'Just the letter'}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">
        {tailored
          ? "Both open on the Resume page, the resume from this job's tailoring. Your edits above go in."
          : 'Tailoring your resume for this job runs first, then both open on the Resume page. Your edits above go in.'}
      </p>
    </Card>
  );
}
