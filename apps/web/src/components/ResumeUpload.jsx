import { useId, useRef, useState } from 'react';
import { uploadResume } from '../api.js';

const CONTROL = 'cursor-pointer text-sm text-ink underline decoration-edge underline-offset-4 transition-colors duration-fast ease-ease hover:decoration-ink';

// Upload is how a profile usually starts, but it only proposes values: the
// record beside it stays the place where wrong extractions get fixed. A
// quiet card rather than a dropzone: the whole card still takes a dropped
// file, it just does not look like a hole in the page. `children` is the
// fill-in control, which belongs with the file it reads.
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
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        send(event.dataTransfer?.files?.[0]);
      }}
      className="flex flex-col gap-3 rounded-md border border-line bg-panel p-4 transition-colors duration-fast ease-ease focus-within:border-edge"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">Resume (PDF)</label>
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={(event) => send(event.target.files?.[0])}
          className="sr-only"
        />
        <span aria-live="polite" className="text-sm text-muted">
          {busy ? 'Reading your resume...' : resumeName ? `On file: ${resumeName}` : ''}
        </span>
        {!busy && (resumeName ? (
          <label htmlFor={inputId} className={`${CONTROL} self-start`}>Replace</label>
        ) : (
          <label htmlFor={inputId} className="cursor-pointer text-sm text-muted">
            Drop a PDF here or <span className={CONTROL}>choose one</span>. 5MB max.
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-ember">{error}</p>}
      {children}
    </div>
  );
}
