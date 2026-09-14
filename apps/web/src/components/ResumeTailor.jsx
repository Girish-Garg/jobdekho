import { usePostingAction } from '../lib/usePostingAction.js';
import AiError from './AiError.jsx';
import ResumeTailorResult from './ResumeTailorResult.jsx';

const SECONDARY = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60';

// The download is named for the employer, since a person tailoring for
// several jobs ends up with several files.
const fileNameFor = (company) => {
  const slug = String(company || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? `resume-${slug}.txt` : 'resume-tailored.txt';
};

// "Tailor my resume for this job": sends the resume on file and the posting
// to the CLI with no tools, and shows the rewrite behind the server's own
// fact check of it. A saved rewrite shows first and the button becomes
// "Tailor again", so a posting already tailored for never costs a second
// call by accident. While a CLI that went missing is being reported, the
// button is withheld: it could only fail, and the alert offers the re-probe.
export default function ResumeTailor({ posting, cli }) {
  const { saved, busy, progress, error, run, clearError } = usePostingAction({
    postingId: posting.id, kind: 'resume-tailor', providers: cli.providers,
    noun: 'Resume', doing: 'rewriting',
  });

  if (saved === undefined) return <p className="font-mono text-xs text-muted">Looking for an earlier rewrite...</p>;
  const blocked = error?.kind === 'not_found';

  return (
    <div className="flex flex-col gap-2">
      {saved && <ResumeTailorResult record={saved} providers={cli.providers} fileName={fileNameFor(posting.company)} />}
      <div className="flex flex-wrap items-center gap-3">
        {!blocked && (
          <button type="button" disabled={busy} onClick={run} className={SECONDARY}>
            {busy ? 'Tailoring...' : saved ? 'Tailor again' : 'Tailor my resume for this job'}
          </button>
        )}
        <span aria-live="polite" className="text-sm text-muted">{busy ? progress : ''}</span>
      </div>
      <AiError error={error} checking={cli.checking} onRecheck={() => (clearError(), cli.refresh())} />
      {!saved && (
        <p className="text-xs leading-relaxed text-muted">
          Sends the resume on file and this posting to {cli.ready.label} on this computer, with no tools.
          Takes a minute or two. The rewrite is checked against your original before you see it.
        </p>
      )}
    </div>
  );
}

// The tool policy its server-side twin runs under, and the sentence the gate
// shows when no installed CLI can take it (see AiGate).
ResumeTailor.policy = 'none';
ResumeTailor.intro = 'Tailoring the resume asks an AI CLI installed on this computer, on your own subscription.';
