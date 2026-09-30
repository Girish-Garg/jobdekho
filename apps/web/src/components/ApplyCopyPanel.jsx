import { useEffect, useState } from 'react';
import { getApplyCopy, applyFileUrl } from '../api/apply.js';

// Everything Apply assist would have filled, to paste into the form in the
// person's own browser: the way through whenever a site will not work in the
// Apply browser (one that blocks automated browsers, a "Continue with Google"
// sign-in). Each value copies with one press; the files download.
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
      className="btn btn-quiet btn-sm shrink-0"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function ApplyCopyPanel({ postingId, sessionId, files }) {
  const [copy, setCopy] = useState(null);
  useEffect(() => {
    getApplyCopy(postingId).then(setCopy).catch(() => setCopy({ rows: [], coverLetter: '' }));
  }, [postingId]);

  if (!copy) return <p className="px-2 py-3 text-sm text-muted">Gathering your details...</p>;
  return (
    <section aria-label="Copy your details" className="flex min-h-0 flex-col gap-3 overflow-y-auto px-1">
      <ul className="flex flex-col gap-1">
        {copy.rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-select">
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted">{row.label}</span>
              <span className="block truncate text-sm text-ink">{row.value}</span>
            </span>
            <CopyButton text={row.value} />
          </li>
        ))}
      </ul>
      {copy.coverLetter && (
        <div className="flex flex-col gap-1">
          <span className="flex items-center justify-between text-xs text-muted">Your cover letter for this job<CopyButton text={copy.coverLetter} /></span>
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md border border-line p-2 text-xs text-ink">{copy.coverLetter}</p>
        </div>
      )}
      {sessionId && (files?.resume || files?.cover) && (
        <div className="flex flex-wrap gap-2">
          {files.resume && <a href={applyFileUrl(sessionId, 'resume')} className="btn btn-quiet btn-sm" download>{files.resume}</a>}
          {files.cover && <a href={applyFileUrl(sessionId, 'cover')} className="btn btn-quiet btn-sm" download>{files.cover}</a>}
        </div>
      )}
    </section>
  );
}
