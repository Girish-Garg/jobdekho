import { useState } from 'react';
import { usePostingAction, versionsOf } from '../lib/usePostingAction.js';
import { relativeDay } from '../lib/time.js';
import AiError from './AiError.jsx';
import AiRefine from './AiRefine.jsx';
import AiVersions from './AiVersions.jsx';
import FakeCheckResult, { VERDICT_WORD } from './FakeCheckResult.jsx';

const SECONDARY = 'rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60';

// "Is this job real?": sends the posting, and only the posting, to the CLI,
// which goes and looks the company and the role up on the web. A saved
// verdict collapses to one line (the verdict, dated) so a page carrying all
// three AI results does not have to show three full write-ups at once; a
// click opens it back up. Running a fresh check opens it back up too, since
// the person who just asked for one wants to see it land, not go hunting for
// it. The button becomes "Check again", so a posting already checked never
// costs a second call by accident. While a CLI that went missing is being
// reported, the button is withheld: it could only fail, and the alert
// already offers the re-probe.
export default function FakeCheck({ posting, cli }) {
  const { saved, busy, progress, error, run, refine, clearError } = usePostingAction({
    postingId: posting.id, kind: 'fake-check', providers: cli.providers,
    noun: 'Posting', doing: 'checking the web',
  });
  const [expanded, setExpanded] = useState(false);
  // Which version is on screen; null means the newest, so a fresh run or
  // refine shows what it just produced without this having to track length.
  const [selected, setSelected] = useState(null);

  if (saved === undefined) return <p className="font-mono text-xs text-muted">Looking for an earlier check...</p>;
  const blocked = error?.kind === 'not_found';
  const summary = saved && `${VERDICT_WORD[saved.result.verdict] || VERDICT_WORD.unclear} · checked ${relativeDay(saved.createdAt)}`;
  const versions = versionsOf(saved);
  const shown = saved && versions[selected ?? versions.length - 1];

  function onRun() {
    setExpanded(true);
    setSelected(null);
    run();
  }

  function onRefine(instruction) {
    setExpanded(true);
    setSelected(null);
    refine(instruction);
  }

  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      {!saved && (
        <p className="text-xs leading-relaxed text-muted">
          Asks {cli.ready.label} on this computer to look the company and this role up on the web.
          Takes a few minutes. Only the posting is sent, never your resume or profile.
        </p>
      )}
      {saved && (
        <details className="group" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
            <span className="text-sm text-ink">{summary}</span>
            <span aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180">&#8964;</span>
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            <FakeCheckResult record={shown} providers={cli.providers} />
            <AiVersions record={saved} selected={selected} onSelect={setSelected} />
            {!blocked && <AiRefine label={cli.ready.label} busy={busy} onRefine={onRefine} />}
          </div>
        </details>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!blocked && (
          <button type="button" disabled={busy} onClick={onRun} className={SECONDARY}>
            {busy ? 'Checking...' : saved ? 'Check again' : 'Is this job real?'}
          </button>
        )}
        <span aria-live="polite" className="text-sm text-muted">{busy ? progress : ''}</span>
      </div>
      <AiError error={error} checking={cli.checking} onRecheck={() => (clearError(), cli.refresh())} />
    </div>
  );
}

// The tool policy its server-side twin runs under, and the sentence the gate
// shows when no installed CLI can take it (see AiGate). A browser, which is
// why Antigravity is never the CLI named above.
FakeCheck.policy = 'web';
FakeCheck.intro = 'Checking whether a job is real asks an AI CLI installed on this computer, on your own subscription.';
