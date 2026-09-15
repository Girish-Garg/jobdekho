import { useState } from 'react';
import { usePostingAction } from '../lib/usePostingAction.js';
import { relativeDay } from '../lib/time.js';
import AiError from './AiError.jsx';
import CoverLetterResult from './CoverLetterResult.jsx';

const SECONDARY = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60';

// "Write a cover letter": sends the resume on file and the posting to the
// CLI, which writes a draft the person edits before sending it themselves.
// A saved letter collapses to one line (when it was written) so a page
// carrying all three AI results does not have to show three drafts at once;
// a click opens it back up, and writing a fresh one opens it back up too,
// since the person who just asked for it wants to read it, not go looking
// for it. The button becomes "Write again", so a posting already written
// for never costs a second call by accident.
export default function CoverLetter({ posting, cli }) {
  const { saved, busy, progress, error, run, clearError } = usePostingAction({
    postingId: posting.id, kind: 'cover-letter', providers: cli.providers,
    noun: 'Posting', doing: 'writing',
  });
  const [expanded, setExpanded] = useState(false);

  if (saved === undefined) return <p className="font-mono text-xs text-muted">Looking for an earlier letter...</p>;
  const blocked = error?.kind === 'not_found';
  const summary = saved && `Cover letter written ${relativeDay(saved.createdAt)}`;

  function onRun() {
    setExpanded(true);
    run();
  }

  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      {!saved && (
        <p className="text-xs leading-relaxed text-muted">
          Sends the resume on file and this posting to {cli.ready.label} on this computer, to write from.
        </p>
      )}
      {saved && (
        <details className="group" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <span className="text-sm text-ink">{summary}</span>
            <span aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180">&#8964;</span>
          </summary>
          <div className="mt-2">
            <CoverLetterResult record={saved} providers={cli.providers} />
          </div>
        </details>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!blocked && (
          <button type="button" disabled={busy} onClick={onRun} className={SECONDARY}>
            {busy ? 'Writing...' : saved ? 'Write again' : 'Write a cover letter'}
          </button>
        )}
        <span aria-live="polite" className="text-sm text-muted">{busy ? progress : ''}</span>
      </div>
      <AiError error={error} checking={cli.checking} onRecheck={() => (clearError(), cli.refresh())} />
    </div>
  );
}

// The tool policy its server-side twin runs under, and the sentence the gate
// shows when no installed CLI can take it (see AiGate).
CoverLetter.policy = 'none';
CoverLetter.intro = 'Writing a cover letter asks an AI CLI installed on this computer, on your own subscription.';
