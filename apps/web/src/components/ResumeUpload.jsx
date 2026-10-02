import { useId, useRef, useState } from 'react';
import { uploadResume } from '../api.js';
import Card from './ui/Card.jsx';
import { DocumentIcon, UploadIcon } from './Icon.jsx';

// Upload is how a profile usually starts, but it only proposes values: the
// record beside it stays the place where wrong extractions get fixed. With a
// file on file the card shows it as a file (its name, its kind, a replace
// control); without one, the card is a drop zone that says so. The whole
// card takes a dropped file either way. `children` is the fill-in control,
// which belongs with the file it reads.
export default function ResumeUpload({ resumeName, onUploaded, children }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const inputId = useId();

  async function send(file) {
    if (!file || busy) return;
    setError('');
    setBusy(true);
    try {
      onUploaded(await uploadResume(file));
    } catch (err) {
      // The 422 messages name the actual problem (a scanned PDF, an expired
      // extractor login) and what to do about it, so they go up verbatim.
      setError(err.message);
    } finally {
      setBusy(false);
      // Cleared so picking the same corrected file again still fires change.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Card
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        send(event.dataTransfer?.files?.[0]);
      }}
      className="flex flex-col gap-4 p-4 transition-colors duration-fast ease-ease focus-within:border-edge"
    >
      <label htmlFor={inputId} className="text-xs font-semibold text-muted">Resume (PDF)</label>
      <input id={inputId} ref={inputRef} type="file" accept="application/pdf" disabled={busy} onChange={(event) => send(event.target.files?.[0])} className="sr-only" />

      {resumeName || busy ? (
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <DocumentIcon size={18} />
          </span>
          <span aria-live="polite" className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{busy ? 'Reading your resume...' : resumeName}</span>
            <span className="block text-xs text-muted">{busy ? 'Pulling the text out of the PDF' : 'PDF on file'}</span>
          </span>
          {!busy && (
            <label htmlFor={inputId} title="Replace the resume" className="btn btn-quiet btn-sm shrink-0 px-3 py-1.5 font-medium">
              <UploadIcon size={12} />
              Replace
            </label>
          )}
        </div>
      ) : (
        <label htmlFor={inputId} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-edge bg-paper/60 px-4 py-6 text-center transition-colors duration-fast ease hover:border-primary/50 hover:bg-primary/5">
          <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
            <UploadIcon size={16} />
          </span>
          <span className="text-sm font-medium text-ink">Drop a PDF here or choose one</span>
          <span className="text-xs text-muted">Text PDFs only, 5MB max</span>
        </label>
      )}

      {error && <p role="alert" className="text-sm text-ember">{error}</p>}
      {children}
    </Card>
  );
}
