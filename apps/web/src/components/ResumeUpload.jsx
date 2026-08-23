import { useRef, useState } from 'react';
import { uploadResume } from '../api.js';

// Upload is how a profile usually starts, but it only proposes values: the
// form below stays the place where wrong extractions get fixed.
export default function ResumeUpload({ resumeName, onUploaded }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

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
    <div className="flex flex-col gap-2">
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          send(event.dataTransfer?.files?.[0]);
        }}
        className="flex cursor-pointer flex-col items-start gap-1.5 rounded-lg border border-dashed border-line bg-panel px-4 py-4 transition hover:border-ink focus-within:border-ink focus-within:ring-1 focus-within:ring-ink"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">Resume (PDF)</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={(event) => send(event.target.files?.[0])}
          className="sr-only"
        />
        <span className="text-sm text-ink" aria-live="polite">
          {busy
            ? 'Reading your resume...'
            : 'Drop a PDF here or click to choose one. 5MB max.'}
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-sm text-ember">{error}</p>
      ) : (
        resumeName && (
          <p className="font-mono text-xs text-muted">On file: {resumeName}</p>
        )
      )}
    </div>
  );
}
