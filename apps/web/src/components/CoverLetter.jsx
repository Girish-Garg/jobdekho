import { usePostingAction } from '../lib/usePostingAction.js';
import AiError from './AiError.jsx';
import CoverLetterResult from './CoverLetterResult.jsx';

const SECONDARY = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60';

// "Write a cover letter": sends the resume on file and the posting to the
// CLI, which writes a draft the person edits before sending it themselves.
// A saved letter shows first and the button becomes "Write again", so a
// posting already written for never costs a second call by accident.
export default function CoverLetter({ posting, cli }) {
  const { saved, busy, progress, error, run, clearError } = usePostingAction({
    postingId: posting.id, kind: 'cover-letter', providers: cli.providers,
    noun: 'Posting', doing: 'writing',
  });

  if (saved === undefined) return <p className="font-mono text-xs text-muted">Looking for an earlier letter...</p>;
  const blocked = error?.kind === 'not_found';

  return (
    <div className="flex flex-col gap-2">
      {saved && <CoverLetterResult record={saved} providers={cli.providers} />}
      <div className="flex flex-wrap items-center gap-3">
        {!blocked && (
          <button type="button" disabled={busy} onClick={run} className={SECONDARY}>
            {busy ? 'Writing...' : saved ? 'Write again' : 'Write a cover letter'}
          </button>
        )}
        <span aria-live="polite" className="text-sm text-muted">{busy ? progress : ''}</span>
      </div>
      <AiError error={error} checking={cli.checking} onRecheck={() => (clearError(), cli.refresh())} />
      {!saved && (
        <p className="text-xs leading-relaxed text-muted">
          Sends the resume on file and this posting to {cli.ready.label} on this computer, to write from.
        </p>
      )}
    </div>
  );
}

// The tool policy its server-side twin runs under, and the sentence the gate
// shows when no installed CLI can take it (see AiGate).
CoverLetter.policy = 'none';
CoverLetter.intro = 'Writing a cover letter asks an AI CLI installed on this computer, on your own subscription.';
