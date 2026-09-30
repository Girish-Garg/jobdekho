import { useState } from 'react';
import { DocumentIcon, SparkleIcon } from './Icon.jsx';

const BOTH = 'inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary '
  + 'transition duration-fast ease hover:brightness-110 disabled:opacity-60';
const ONE = 'inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-1.5 text-sm font-medium text-ink '
  + 'transition-colors duration-fast ease hover:border-edge disabled:opacity-60';

// What the letter becomes next: a cover letter document, or that and a
// resume tailored to the same job in one go (see lib/makeApplicationDocs.js).
// Both take the text as it is in the box above, edits included. When the job
// has no tailoring yet, the saffron button says it will run one first, since
// that is an AI call of its own and takes as long as one.
export default function CoverLetterDocs({ text, tailored, onMakeLetter, onMakeBoth }) {
  const [busy, setBusy] = useState(null);
  if (!onMakeLetter && !onMakeBoth) return null;

  async function run(which, make) {
    setBusy(which);
    try {
      await make();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-paper/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {onMakeBoth && (
          <button type="button" disabled={Boolean(busy)} onClick={() => run('both', () => onMakeBoth(text, tailored))} className={BOTH}>
            <SparkleIcon size={14} />
            {busy === 'both' ? 'Making them...' : tailored ? 'Make the letter and a tailored resume' : 'Tailor my resume and make both'}
          </button>
        )}
        {onMakeLetter && (
          <button type="button" disabled={Boolean(busy)} onClick={() => run('letter', () => onMakeLetter(text))} className={ONE}>
            <DocumentIcon size={14} />
            {busy === 'letter' ? 'Making it...' : 'Just the letter'}
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        {tailored
          ? "Both open on the Resume page, the resume from this job's tailoring. Your edits above go in."
          : 'Tailoring your resume for this job runs first, then both open on the Resume page. Your edits above go in.'}
      </p>
    </div>
  );
}
