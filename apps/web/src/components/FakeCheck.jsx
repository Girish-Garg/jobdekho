import { usePostingAction } from '../lib/usePostingAction.js';
import AiError from './AiError.jsx';
import FakeCheckResult from './FakeCheckResult.jsx';

const SECONDARY = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60';

// "Is this job real?": sends the posting, and only the posting, to the CLI,
// which goes and looks the company and the role up on the web. A saved
// verdict shows first and the button becomes "Check again", so a posting
// already checked never costs a second call by accident. While a CLI that
// went missing is being reported, the button is withheld: it could only
// fail, and the alert already offers the re-probe.
export default function FakeCheck({ posting, cli }) {
  const { saved, busy, progress, error, run, clearError } = usePostingAction({
    postingId: posting.id, kind: 'fake-check', providers: cli.providers,
    noun: 'Posting', doing: 'checking the web',
  });

  if (saved === undefined) return <p className="font-mono text-xs text-muted">Looking for an earlier check...</p>;
  const blocked = error?.kind === 'not_found';

  return (
    <div className="flex flex-col gap-2">
      {saved && <FakeCheckResult record={saved} providers={cli.providers} />}
      <div className="flex flex-wrap items-center gap-3">
        {!blocked && (
          <button type="button" disabled={busy} onClick={run} className={SECONDARY}>
            {busy ? 'Checking...' : saved ? 'Check again' : 'Is this job real?'}
          </button>
        )}
        <span aria-live="polite" className="text-sm text-muted">{busy ? progress : ''}</span>
      </div>
      <AiError error={error} checking={cli.checking} onRecheck={() => (clearError(), cli.refresh())} />
      {!saved && (
        <p className="text-xs leading-relaxed text-muted">
          Asks {cli.ready.label} on this computer to look the company and this role up on the web.
          Takes a few minutes. Only the posting is sent, never your resume or profile.
        </p>
      )}
    </div>
  );
}
